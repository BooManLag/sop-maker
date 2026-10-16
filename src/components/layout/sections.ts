import { FileText, FlaskConical, Layers, Search, type LucideIcon } from 'lucide-react';

export type Section = 'overview' | 'processes' | 'findings' | 'trials';

export const sectionLabels: Record<Section, string> = {
  overview: 'Overview',
  processes: 'Processes',
  findings: 'Findings',
  trials: 'Trials',
};

export const navItems: { section: Section; href: string; icon: LucideIcon }[] = [
  { section: 'overview', href: '/', icon: Layers },
  { section: 'processes', href: '/processes', icon: FileText },
  { section: 'findings', href: '/findings', icon: Search },
  { section: 'trials', href: '/trials', icon: FlaskConical },
];

/** Maps a URL to the sidebar section it belongs to; improvement flows live under Findings. */
export function sectionFor(pathname: string): Section {
  const [first] = pathname.split('/').filter(Boolean);
  if (first === 'processes') return 'processes';
  if (first === 'findings' || first === 'scans') return 'findings';
  if (first === 'trials' || first === 'change-requests') return 'trials';
  return 'overview';
}

/** Names the page below a section for the breadcrumb; undefined on a section's own page. */
export function pageLabelFor(pathname: string): string | undefined {
  const [first, second, third] = pathname.split('/').filter(Boolean);
  if (!second) return undefined;
  if (first === 'processes')
    return second === 'new' ? 'New process' : third ? 'Capture' : 'Process';
  if (first === 'scans') return second === 'new' ? 'New scan' : 'Scan';
  if (first === 'findings') return third ? 'Plan a trial' : 'Finding';
  if (first === 'trials') return 'Trial';
  if (first === 'change-requests') return 'Change request';
  return undefined;
}
