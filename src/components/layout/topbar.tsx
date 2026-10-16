'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { AccountBadge } from './account';
import { hrefFor, pageLabelFor, sectionFor, sectionLabels } from './sections';

/** Desktop header: where you are, and who is signed in. */
export function Topbar() {
  const pathname = usePathname();
  const section = sectionFor(pathname);
  const page = pageLabelFor(pathname);
  const current = 'font-semibold text-foreground';
  return (
    <header className="flex h-18 items-center justify-between border-b border-border bg-topbar px-7.5 max-md:hidden lg:px-11">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-3 text-xs text-muted-foreground"
      >
        {page ? (
          <>
            <Link href={hrefFor(section)} className="hover:text-foreground">
              {sectionLabels[section]}
            </Link>
            <ChevronRight size={13} aria-hidden />
            <strong aria-current="page" className={current}>
              {page}
            </strong>
          </>
        ) : (
          <strong aria-current="page" className={current}>
            {sectionLabels[section]}
          </strong>
        )}
      </nav>
      <AccountBadge />
    </header>
  );
}
