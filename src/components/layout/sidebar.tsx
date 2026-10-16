'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Leaf, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, useAccount, useNavCounts } from './account';
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
        aria-label="Good Exception home"
        className="flex items-center gap-3 text-xl leading-[0.98] font-bold tracking-[-1px] text-foreground"
      >
        <span className="grid h-12 w-10 place-items-center">
          <LogoMark size={23} />
        </span>
        <Wordmark stacked />
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

/** The signed-in person; clicking signs out. */
function UserCard({ account }: { account: ReturnType<typeof useAccount> }) {
  const content = (
    <>
      <Avatar initials={account.initials} photo={account.photo} />
      <span className="min-w-0 flex-1">
        <span className="block truncate">{account.name}</span>
        <small className="block text-tiny text-muted-foreground">{account.role}</small>
      </span>
      {account.signOut && <LogOut size={16} aria-hidden />}
    </>
  );
  const className =
    'flex w-full items-center gap-2.5 border-t border-border py-5.5 text-left text-xs';
  const { signOut } = account;
  return signOut ? (
    <button
      type="button"
      title="Sign out"
      aria-label={`Sign out ${account.name}`}
      onClick={() => void signOut()}
      className={className}
    >
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  );
}
