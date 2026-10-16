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

type PathSegments = [second?: string, third?: string];

/**
 * Every top-level route: the sidebar section it belongs to (improvement flows live under
 * Findings) and the breadcrumb label for pages below that section.
 */
const routes: Record<string, { section: Section; pageLabel: (...rest: PathSegments) => string }> = {
  processes: {
    section: 'processes',
    pageLabel: (second, third) => {
      if (second === 'new') return 'New process';
      return third ? 'Capture' : 'Process';
    },
  },
  scans: {
    section: 'findings',
    pageLabel: (second) => (second === 'new' ? 'New scan' : 'Scan'),
  },
  findings: {
    section: 'findings',
    pageLabel: (_second, third) => (third ? 'Plan a trial' : 'Finding'),
  },
  trials: { section: 'trials', pageLabel: () => 'Trial' },
  'change-requests': { section: 'trials', pageLabel: () => 'Change request' },
};

const segmentsOf = (pathname: string) => pathname.split('/').filter(Boolean);

export function sectionFor(pathname: string): Section {
  const [first] = segmentsOf(pathname);
  return routes[first]?.section ?? 'overview';
}

/** Names the page below a section for the breadcrumb; undefined on a section's own page. */
export function pageLabelFor(pathname: string): string | undefined {
  const [first, second, third] = segmentsOf(pathname);
  const route = routes[first];
  return route && second ? route.pageLabel(second, third) : undefined;
}

export function hrefFor(section: Section): string {
  return navItems.find((item) => item.section === section)?.href ?? '/';
}
