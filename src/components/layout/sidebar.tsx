'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, FlaskConical, Layers, Leaf, LogOut, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useSession } from '@/features/auth/auth-gate';
import type { Workspace } from '@/lib/client/api';
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
  const account = useAccount();
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
          {account.workspace.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 truncate font-semibold">{account.workspace}</span>
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
        <UserCard account={account} />
      </div>
    </div>
  );
}

const roleLabels: Record<Workspace['role'], string> = {
  viewer: 'Viewer',
  expert: 'Expert',
  reviewer: 'Reviewer',
  admin: 'Admin',
};

/** Who is signed in, as Google and the server describe them; a placeholder in the local demo. */
export function useAccount() {
  const session = useSession();
  const { data } = useWorkspace();
  const name = session
    ? session.user.displayName || session.user.email || 'Signed in'
    : 'Local demo';
  return {
    name,
    initials: initialsOf(name),
    photo: session?.user.photoURL ?? undefined,
    role: data ? roleLabels[data.role] : '',
    workspace: !session
      ? 'Local demo'
      : !data
        ? ''
        : data.organization === 'public'
          ? 'Shared workspace'
          : data.organization,
    signOut: session?.signOut,
  };
}

function initialsOf(name: string) {
  const words = name.split(/[\s@._-]+/).filter(Boolean);
  return (
    words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? '?').slice(0, 2)
  ).toUpperCase();
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

export function Avatar({
  initials,
  photo,
  small = false,
}: {
  initials: string;
  photo?: string;
  small?: boolean;
}) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-full border-[3px] border-brand-100 bg-accent font-semibold text-brand-600',
        small ? 'size-7 text-2xs' : 'size-8 text-tiny',
      )}
    >
      {photo ? (
        // Google profile photos are small, external and already sized; next/image adds nothing.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}
