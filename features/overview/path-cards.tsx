import Link from 'next/link';
import { ArrowRight, ChevronRight, FileText, Search, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Path = {
  href: string;
  icon: LucideIcon;
  number: string;
  title: string;
  lines: [string, string];
  cta: string;
  steps: string[];
  featured?: boolean;
};

const paths: Path[] = [
  {
    href: '/processes/new',
    icon: FileText,
    number: '01 / CREATE',
    title: 'Start with your best know-how.',
    lines: ['Turn an expert walkthrough into a clear,', 'practical SOP your team can trust.'],
    cta: 'Create first SOP',
    steps: ['Capture', 'Clarify', 'Review & publish'],
    featured: true,
  },
  {
    href: '/scans/new',
    icon: Search,
    number: '02 / IMPROVE',
    title: 'Your next improvement is in the field.',
    lines: [
      'Find recurring practices linked to better outcomes.',
      'Understand why. Test them deliberately.',
    ],
    cta: 'Improve existing SOP',
    steps: ['Scan', 'Find', 'Validate'],
  },
];

export function PathCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-3 md:gap-4.5">
      {paths.map((path) => (
        <PathCard key={path.href} {...path} />
      ))}
    </div>
  );
}

function PathCard({ href, icon: Icon, number, title, lines, cta, steps, featured }: Path) {
  const gutter = 'px-6 sm:px-4.5 md:px-5 lg:px-7';
  return (
    <Link
      href={href}
      className={cn(
        'overflow-hidden rounded-xl border bg-card pt-5.5 text-foreground shadow-card transition-colors hover:border-brand-300 sm:pt-5 md:pt-6 xl:pt-7.5',
        featured ? 'border-border-strong bg-brand-100/60' : 'border-border',
      )}
    >
      <div className={gutter}>
        <div className="mb-5 flex items-center justify-between sm:mb-5.5 md:mb-6 xl:mb-7.5">
          <span
            className={cn(
              'grid size-9.5 place-items-center rounded-lg border',
              featured
                ? 'border-border-strong bg-brand-100 text-brand-500'
                : 'border-border bg-background text-brand-400',
            )}
          >
            <Icon size={22} aria-hidden />
          </span>
          <span className="text-2xs font-semibold tracking-[1.2px] text-brand-400">{number}</span>
        </div>
        <h2 className="mb-2.5 text-lg leading-[1.4] tracking-[-0.65px] sm:text-md lg:text-lg xl:text-xl">
          {title}
        </h2>
        <p className="mb-5.5 text-sm leading-[1.85] text-muted-foreground sm:mb-6 sm:text-xs md:text-sm xl:text-lead">
          {lines[0]}
          <br className="max-md:hidden" /> {lines[1]}
        </p>
        <div className="mb-5 flex items-center gap-8 text-sm font-semibold text-brand-700 sm:mb-6">
          {cta}
          <ArrowRight size={18} aria-hidden />
        </div>
      </div>
      <div
        className={cn(
          'flex items-center gap-2.5 border-t py-3.5 text-2xs text-brand-400 sm:gap-1 sm:py-3 md:gap-2.5 md:py-3',
          featured ? 'border-border-strong' : 'border-border',
          gutter,
        )}
      >
        {steps.map((step, i) => (
          <span key={step} className="contents">
            {i > 0 && <ChevronRight size={11} aria-hidden />}
            <span>{step}</span>
          </span>
        ))}
      </div>
    </Link>
  );
}
