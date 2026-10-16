'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AccountBadge } from './topbar';
import { useNavCounts } from './sidebar';
import { navItems, sectionFor, sectionLabels } from './sections';

/** Phone header: the mark on the left, the account on the right. */
export function MobileHeader() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-topbar px-4 md:hidden">
      <Link
        href="/"
        aria-label="Good Exception home"
        className="flex items-center gap-1.5 text-md font-bold tracking-[-0.5px] text-foreground"
      >
        <Layers size={20} className="-rotate-7 text-brand-600" aria-hidden />
        good exception<span className="text-brand-300">.</span>
      </Link>
      <AccountBadge />
    </header>
  );
}

/** Phone tab bar; a dot on Findings flags open findings waiting for review. */
export function BottomNav() {
  const active = sectionFor(usePathname());
  const counts = useNavCounts();
  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-30 grid h-17 grid-cols-4 border-t border-border bg-topbar px-1.5 pt-1.5 pb-2.5 md:hidden"
    >
      {navItems.map(({ section, href, icon: Icon }) => {
        const isActive = active === section;
        const needsReview = section === 'findings' && !!counts.findings;
        return (
          <Link
            key={section}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'relative flex flex-col items-center justify-center gap-0.5 text-xs text-foreground-soft',
              isActive && 'font-semibold text-foreground',
            )}
          >
            <span
              className={cn(
                'grid h-7 w-11 place-items-center rounded-full',
                isActive && 'bg-accent text-brand-700',
              )}
            >
              <Icon size={20} aria-hidden />
            </span>
            {sectionLabels[section]}
            {needsReview && (
              <span
                aria-label="Needs review"
                className="absolute top-1.5 left-[calc(50%+10px)] size-2 rounded-full border-[1.5px] border-topbar bg-warning"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
