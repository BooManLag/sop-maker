'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronsUpDown, Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AccountMenu, Avatar, useAccount, useNavCounts } from './account';
import { LogoMark, Wordmark } from './logo';
import { navItems, sectionFor, sectionLabels } from './sections';

export function SidebarContent() {
  const active = sectionFor(usePathname());
  const counts = useNavCounts().bySection;
  const account = useAccount();
  return (
    <div className="flex h-full flex-col px-6 pt-9 max-lg:px-4">
      <Link
        href="/"
        aria-label="Sopify home"
        className="flex items-center gap-3 text-2xl text-foreground"
      >
        <LogoMark size={36} />
        <Wordmark />
      </Link>

      <div className="mt-12 mb-3 text-2xs font-bold tracking-[1.5px] text-muted-foreground">
        WORKSPACE
      </div>
      <div className="flex items-center gap-2 text-xs leading-normal">
        <span className="grid size-7 place-items-center rounded-lg border border-border-strong bg-background text-lead font-semibold">
          {account.workspace.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 truncate font-semibold">{account.workspace}</span>
      </div>

      <nav aria-label="Main navigation" className="mt-8 grid gap-1.5">
        {navItems.map(({ section, href, icon: Icon }) => (
          <Link
            key={section}
            href={href}
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
        <UserCard account={account} />
      </div>
    </div>
  );
}

/** The signed-in person; opens the account menu. */
function UserCard({ account }: { account: ReturnType<typeof useAccount> }) {
  return (
    <AccountMenu side="top">
      <button
        type="button"
        aria-label={`Account: ${account.name}`}
        className="flex w-full items-center gap-2.5 border-t border-border py-5.5 text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar initials={account.initials} photo={account.photo} />
        <span className="min-w-0 flex-1">
          <span className="block truncate">{account.name}</span>
          <small className="block text-tiny text-muted-foreground">{account.role}</small>
        </span>
        <ChevronsUpDown size={16} className="text-muted-foreground" aria-hidden />
      </button>
    </AccountMenu>
  );
}
