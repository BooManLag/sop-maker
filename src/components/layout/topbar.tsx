'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Avatar, useAccount } from './sidebar';
import { navItems, pageLabelFor, sectionFor, sectionLabels } from './sections';

/** Desktop header: where you are, and who is signed in. */
export function Topbar() {
  const pathname = usePathname();
  const section = sectionFor(pathname);
  const page = pageLabelFor(pathname);
  const sectionHref = navItems.find((item) => item.section === section)?.href ?? '/';
  return (
    <header className="flex h-[72px] items-center justify-between border-b border-border bg-topbar px-7.5 max-md:hidden lg:px-11">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-3 text-xs text-muted-foreground"
      >
        {page ? (
          <>
            <Link href={sectionHref} className="hover:text-foreground">
              {sectionLabels[section]}
            </Link>
            <ChevronRight size={13} aria-hidden />
            <strong aria-current="page" className="font-semibold text-foreground">
              {page}
            </strong>
          </>
        ) : (
          <strong aria-current="page" className="font-semibold text-foreground">
            {sectionLabels[section]}
          </strong>
        )}
      </nav>
      <AccountBadge />
    </header>
  );
}

/** Workspace name beside the avatar; on phones this is the only place the workspace shows. */
export function AccountBadge() {
  const account = useAccount();
  return (
    <div className="flex items-center gap-3 sm:gap-6">
      <span className="flex items-center gap-2 text-2xs text-muted-foreground sm:text-tiny">
        <span aria-hidden className="size-1 rounded-full bg-brand-300" />
        {account.workspace}
      </span>
      <Avatar initials={account.initials} photo={account.photo} small />
    </div>
  );
}
