import type { Embedder, AnalysisToolkit } from '../application/analysis/toolkit';
import { MAX_FINDINGS } from '../application/analysis/toolkit';
import type { AnalysisMethod } from '../application/evidence-service';

/**
 * Local-demo stand-ins for Gemini in scan analysis. Notes are grouped by the words they share
 * and a scripted analyst tests and proposes practices through the same toolkit the ADK agent
 * uses, so every number still comes from the code-computed statistics.
 */
export const OFFLINE_ANALYSIS: AnalysisMethod = {
  version: 'offline-demo-v1',
  grouping: 'Jobs grouped offline by the words their notes share (local demo, no Gemini)',
};

const stopWords = new Set(
  'the a an and or of to in on at by for with from as is was were be been it its this that then than into before after per not no yes up out off all each every one two first had has have did done so our we they their them his her'.split(
    ' ',
  ),
);
const stem = (word: string) => word.replace(/(ing|ed|es|s)$/, '') || word;

/** Words of the free-text note only: parts and checklist suffixes repeat on every job. */
export function noteWords(signal: string) {
  const note = signal
    .split(' | ')
    .filter((part) => !/^(Parts|Checklist):/.test(part))
    .join(' ');
  return (note.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((word) => word.length > 2 && !stopWords.has(word))
    .map(stem);
}
export const noteText = (signal: string) =>
  signal
    .split(' | ')
    .filter((part) => !/^(Parts|Checklist):/.test(part))
    .join(' | ')
    .trim();

/** Word-count vectors over the scan's own vocabulary: identical notes match, different ones rarely do. */
export class OfflineEmbedder implements Embedder {
  async embed(texts: string[]) {
    const words = texts.map(noteWords);
    const vocabulary = new Map<string, number>();
    for (const list of words)
      for (const word of list) if (!vocabulary.has(word)) vocabulary.set(word, vocabulary.size);
    return words.map((list) => {
      const vector = new Array<number>(vocabulary.size).fill(0);
      for (const word of list) vector[vocabulary.get(word)!] += 1;
      return vector;
    });
  }
}

type Cluster = ReturnType<AnalysisToolkit['listClusters']>[number];
type Evaluation = Extract<ReturnType<AnalysisToolkit['evaluate']>, { candidateId: string }>;

const gradeRank = (grade: Evaluation['grade']) =>
  grade === 'strong' ? 2 : grade === 'promising' ? 1 : 0;
const reduction = (e: Evaluation) =>
  e.baselineCallbackRatePercent
    ? (e.baselineCallbackRatePercent - e.practiceCallbackRatePercent) /
      e.baselineCallbackRatePercent
    : 0;
/** Better means a higher grade, or the same grade on more jobs while keeping most of the effect. */
const better = (next: Evaluation, current: Evaluation) =>
  gradeRank(next.grade) > gradeRank(current.grade) ||
  (gradeRank(next.grade) === gradeRank(current.grade) &&
    next.jobs > current.jobs &&
    reduction(next) >= Math.max(0.2, reduction(current) * 0.6));

/**
 * The agent is told to skip notes that only restate the SOP, describe the fault or are noise.
 * Offline, a note counts as a practice when it describes doing something extra, earlier or again,
 * and not when it describes leaving something out.
 */
const practiceLanguage =
  /\b(before|after|afterwards|then|again|second|twice|extra|first|re-\w+|recheck\w*|remeasur\w*|retest\w*)\b/i;
const omission =
  /\b(skip\w*|without|instead of|did not|didn't|no time)\b|\bbefore (test|check|inspect)/i;
const describesPractice = (cluster: Cluster) => {
  const note = noteText(cluster.examples[0] ?? '');
  return practiceLanguage.test(note) && !omission.test(note);
};

const wordsOf = (cluster: Cluster) => new Set(noteWords(cluster.examples[0] ?? ''));
const shared = (a: Set<string>, b: Set<string>) => [...a].filter((word) => b.has(word)).length;

function shorten(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max).replace(/\s+\S*$/, '');
  return `${cut}…`;
}
const sentence = (text: string) => {
  const trimmed = text.trim().replace(/[.\s]+$/, '');
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

/** The SOP step the practice most likely changes: most shared words, else the last check step. */
function closestStep(sop: ReturnType<AnalysisToolkit['sop']>, words: Set<string>) {
  const scored = sop.map((step) => ({
    step,
    score: shared(new Set(noteWords(step.action)), words),
  }));
  const best = scored.reduce((a, b) => (b.score > a.score ? b : a), scored[0]);
  if (best && best.score > 0) return best.step;
  const checks = sop.filter((s) => /\b(test|check|inspect|verify|measure|confirm)/i.test(s.action));
  return checks.at(-1) ?? sop.at(-1);
}

/**
 * Scripted stand-in for the ADK agent. It seeds from each group of notes, grows the group with
 * related notes while the code-computed evaluation improves, and proposes what earns a grade.
 */
export async function offlineDriver(toolkit: AnalysisToolkit, signal: AbortSignal) {
  const sop = toolkit.sop();
  const clusters = toolkit.listClusters();
  const words = new Map(clusters.map((c) => [c.clusterId, wordsOf(c)]));
  const evaluate = (ids: string[]) => {
    const result = toolkit.evaluate(ids);
    if ('error' in result) throw new Error(result.error);
    return result;
  };
  const practices = clusters.filter(describesPractice);
  const singles = practices
    .map((c) => ({ cluster: c, evaluation: evaluate([c.clusterId]) }))
    .filter(({ evaluation }) => reduction(evaluation) > 0)
    .sort(
      (a, b) =>
        gradeRank(b.evaluation.grade) - gradeRank(a.evaluation.grade) ||
        b.evaluation.jobs - a.evaluation.jobs,
    );
  const used = new Set<string>();
  let proposed = 0;
  for (const { cluster } of singles) {
    if (signal.aborted) throw new Error('Analysis timed out.');
    if (proposed >= MAX_FINDINGS) break;
    if (used.has(cluster.clusterId)) continue;
    const group = [cluster];
    let current = evaluate([cluster.clusterId]);
    for (let grew = true; grew;) {
      grew = false;
      for (const other of practices) {
        if (used.has(other.clusterId) || group.includes(other)) continue;
        const related = group.some(
          (member) => shared(words.get(member.clusterId)!, words.get(other.clusterId)!) >= 2,
        );
        if (!related) continue;
        const next = evaluate([...group, other].map((c) => c.clusterId));
        if (better(next, current)) {
          group.push(other);
          current = next;
          grew = true;
        }
      }
    }
    if (!current.grade) continue;
    const notes = group
      .sort((a, b) => b.jobs - a.jobs)
      .map((c) => noteText(c.examples[0] ?? ''))
      .filter(Boolean);
    const groupWords = new Set(group.flatMap((c) => [...words.get(c.clusterId)!]));
    const step = closestStep(sop, groupWords);
    if (!step || !notes.length) continue;
    const quoted = notes
      .slice(0, 2)
      .map((note) => `“${shorten(note, 140)}”`)
      .join(' and ');
    const result = toolkit.propose({
      candidateId: current.candidateId,
      title: shorten(sentence(notes[0]), 90),
      standardStepId: step.stepId,
      practice: `${sentence(notes[0])}.`,
      description: `${current.technicians} technicians wrote notes like ${quoted} on ${current.jobs} jobs. These jobs came back less often than the same technicians' other jobs on the same equipment and job type.`,
    });
    if ('accepted' in result) {
      proposed++;
      group.forEach((c) => used.add(c.clusterId));
    }
  }
}
