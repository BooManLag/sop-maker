'use client';

import type { ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { useSession } from '@/features/auth/auth-gate';
import type { Workspace } from '@/lib/client/api';
import { useWorkspace } from '@/lib/client/queries';
import { needsReview } from '@/lib/domain/findings';
import { cn } from '@/lib/utils';
import type { Section } from './sections';

type NavCounts = {
  /** Badge counts per section; a section without a badge is absent. */
  bySection: Partial<Record<Section, number>>;
  /** Findings nobody has reviewed yet; the phone tab bar flags these with a dot. */
  findingsToReview: number;
};

export function useNavCounts(): NavCounts {
  const { data } = useWorkspace();
  if (!data) return { bySection: {}, findingsToReview: 0 };
  return {
    bySection: {
      processes: data.processes.length,
      findings: data.findings.filter((f) => f.status !== 'dismissed').length,
      trials: data.trials.length || undefined,
    },
    findingsToReview: data.findings.filter(needsReview).length,
  };
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
    email: session?.user.email ?? undefined,
    initials: initialsOf(name),
    photo: session?.user.photoURL ?? undefined,
    role: data ? roleLabels[data.role] : '',
    workspace: !session ? 'Local demo' : !data ? '' : workspaceName(data.organization),
    signOut: session?.signOut,
  };
}

const namedWorkspaces: Record<string, string> = {
  public: 'Shared workspace',
  prototype: 'Prototype workspace',
};

/** Organization IDs are slugs; show a readable name. */
function workspaceName(organization: string) {
  return (
    namedWorkspaces[organization] ?? organization.charAt(0).toUpperCase() + organization.slice(1)
  );
}

function initialsOf(name: string) {
  const words = name.split(/[\s@._-]+/).filter(Boolean);
  return (
    words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? '?').slice(0, 2)
  ).toUpperCase();
}

/** Who is signed in and where, with sign out; opened from the sidebar card or the phone avatar. */
export function AccountMenu({
  children,
  side = 'bottom',
}: {
  children: ReactNode;
  side?: 'top' | 'bottom';
}) {
  const account = useAccount();
  const { signOut } = account;
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{children}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side={side}
          align="end"
          sideOffset={8}
          className="z-50 w-64 rounded-sm border border-border bg-popover p-1.5 text-popover-foreground shadow-pop"
        >
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            <Avatar initials={account.initials} photo={account.photo} />
            <div className="min-w-0 text-xs">
              <p className="m-0 truncate font-semibold">{account.name}</p>
              {account.email && account.email !== account.name && (
                <p className="m-0 truncate text-muted-foreground">{account.email}</p>
              )}
            </div>
          </div>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-border px-2.5 py-2.5 text-tiny">
            <dt className="text-muted-foreground">Workspace</dt>
            <dd className="m-0 truncate text-right font-medium">{account.workspace}</dd>
            {account.role && (
              <>
                <dt className="text-muted-foreground">Role</dt>
                <dd className="m-0 text-right font-medium">{account.role}</dd>
              </>
            )}
          </dl>
          {signOut && <DropdownMenu.Separator className="-mx-1.5 mb-1 h-px bg-border" />}
          {signOut && (
            <DropdownMenu.Item
              onSelect={() => void signOut()}
              className="flex cursor-pointer items-center gap-2 rounded-xs px-2.5 py-2 text-xs outline-none data-[highlighted]:bg-brand-100"
            >
              <LogOut size={14} aria-hidden />
              Sign out
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
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
