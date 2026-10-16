'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AccountMenu, Avatar, useAccount, useNavCounts } from './account';
import { LogoMark, Wordmark } from './logo';
import { navItems, sectionFor, sectionLabels } from './sections';

/** Phone header: the mark on the left, the account menu on the right. */
export function MobileHeader() {
  const account = useAccount();
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-topbar px-4 md:hidden">
      <Link
        href="/"
        aria-label="Good Exception home"
        className="flex items-center gap-1.5 text-md font-bold tracking-[-0.5px] text-foreground"
      >
        <LogoMark size={20} />
        <Wordmark />
      </Link>
      <AccountMenu>
        <button
          type="button"
          aria-label={`Account: ${account.name}`}
          className="grid size-11 place-items-center rounded-full"
        >
          <Avatar initials={account.initials} photo={account.photo} small />
        </button>
      </AccountMenu>
    </header>
  );
}

/** Phone tab bar; a dot on Findings flags findings nobody has reviewed yet. */
export function BottomNav() {
  const active = sectionFor(usePathname());
  const { findingsToReview } = useNavCounts();
  return (
    <nav
      aria-label="Tab bar"
      className="fixed inset-x-0 bottom-0 z-30 grid h-17 grid-cols-4 border-t border-border bg-topbar px-1.5 pt-1.5 pb-2.5 md:hidden"
    >
      {navItems.map((item) => (
        <TabLink
          key={item.section}
          {...item}
          isActive={active === item.section}
          hasUnreviewed={item.section === 'findings' && findingsToReview > 0}
        />
      ))}
    </nav>
  );
}

function TabLink({
  section,
  href,
  icon: Icon,
  isActive,
  hasUnreviewed,
}: (typeof navItems)[number] & { isActive: boolean; hasUnreviewed: boolean }) {
  return (
    <Link
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
      {hasUnreviewed ? (
        <>
          <span className="sr-only">, needs review</span>
          <span
            aria-hidden
            className="absolute top-1.5 left-1/2 ml-2.5 size-2 rounded-full border-[1.5px] border-topbar bg-warning"
          />
        </>
      ) : null}
    </Link>
  );
}
