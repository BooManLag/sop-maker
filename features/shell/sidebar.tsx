'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  FileText,
  FlaskConical,
  Layers,
  Leaf,
  MoreHorizontal,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import type { LucideIcon } from 'lucide-react';
import { useWorkspace } from '@/lib/client/queries';
import { cn } from '@/lib/utils';
import { sectionFor, sectionLabels, type Section } from './sections';

const navItems: { section: Section; href: string; icon: LucideIcon }[] = [
  { section: 'overview', href: '/', icon: Layers },
  { section: 'processes', href: '/processes', icon: FileText },
  { section: 'findings', href: '/findings', icon: Search },
  { section: 'trials', href: '/trials', icon: FlaskConical },
];

function useNavCounts(): Partial<Record<Section, number>> {
  const { data } = useWorkspace();
  if (!data) return {};
  return {
    processes: data.processes.length,
    findings: data.findings.filter((f) => f.status !== 'dismissed').length,
    trials: data.trials.length || undefined,
  };
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const active = sectionFor(usePathname());
  const counts = useNavCounts();
  return (
    <div className="flex h-full flex-col px-6 pt-9 max-lg:sm:px-4">
      <Link
        href="/"
        onClick={onNavigate}
        aria-label="Good Exception home"
        className="flex items-center gap-3 text-xl leading-[0.98] font-bold tracking-[-1px] text-foreground max-md:sm:gap-1.5 max-md:sm:text-lg"
      >
        <span className="grid h-12 w-10 -rotate-7 place-items-center text-brand-600">
          <Layers size={23} aria-hidden />
        </span>
        <span>
          good
          <br />
          exception<span className="text-brand-300">.</span>
        </span>
      </Link>

      <div className="mt-12 mb-3 text-2xs font-bold tracking-[1.5px] text-muted-foreground">
        WORKSPACE
      </div>
      <div className="flex items-center gap-2 text-xs leading-normal">
        <span className="grid size-7 place-items-center rounded-lg border border-border-strong bg-background text-lead font-semibold">
          N
        </span>
        <span className="flex-1 font-semibold">
          Northfield Services
          <small className="block text-tiny font-normal text-muted-foreground">
            Operations workspace
          </small>
        </span>
        <ChevronDown size={14} aria-hidden />
      </div>

      <nav aria-label="Main navigation" className="mt-8 grid gap-1.5">
        {navItems.map(({ section, href, icon: Icon }) => (
          <Link
            key={section}
            href={href}
            onClick={onNavigate}
            aria-current={active === section ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-sm p-3 text-sm text-muted-foreground transition-colors hover:bg-brand-100',
              active === section &&
                'bg-accent font-semibold text-accent-foreground hover:bg-accent',
            )}
          >
            <Icon size={18} aria-hidden />
            {sectionLabels[section]}
            {counts[section] !== undefined && (
              <span className="ml-auto rounded-xs border border-border-strong px-1 py-px text-tiny font-normal text-brand-400">
                {counts[section]}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="mt-auto">
        <div className="flex items-start gap-2.5 px-1.5 py-5.5">
          <Leaf size={18} className="mt-1 shrink-0 text-brand-400" aria-hidden />
          <p className="m-0 text-xs leading-[1.6]">
            Better practices.
            <br />
            <span className="text-muted-foreground">Never worker rankings.</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            toast.success(
              'You are exploring the local demo workspace. Authentication is not connected.',
            )
          }
          className="flex w-full items-center gap-2.5 border-t border-border py-5.5 text-left text-xs"
        >
          <Avatar initials="AL" />
          <span className="flex-1">
            Alex Lee
            <small className="block text-tiny text-muted-foreground">Operations lead</small>
          </span>
          <MoreHorizontal size={17} aria-hidden />
        </button>
      </div>
    </div>
  );
}

export function Avatar({ initials, small = false }: { initials: string; small?: boolean }) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-full border-[3px] border-brand-100 bg-accent font-semibold text-brand-600',
        small ? 'size-7 text-2xs' : 'size-8 text-tiny',
      )}
    >
      {initials}
    </span>
  );
}
