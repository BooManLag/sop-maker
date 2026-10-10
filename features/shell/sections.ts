export type Section = 'overview' | 'processes' | 'findings' | 'trials';

export const sectionLabels: Record<Section, string> = {
  overview: 'Overview',
  processes: 'Processes',
  findings: 'Findings',
  trials: 'Trials',
};

/** Maps a URL to the sidebar section it belongs to; improvement flows live under Findings. */
export function sectionFor(pathname: string): Section {
  const [first] = pathname.split('/').filter(Boolean);
  if (first === 'processes') return 'processes';
  if (first === 'findings' || first === 'scans') return 'findings';
  if (first === 'trials' || first === 'change-requests') return 'trials';
  return 'overview';
}
