'use client';

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
