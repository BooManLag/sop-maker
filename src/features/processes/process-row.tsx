import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight, FileText, type LucideIcon } from 'lucide-react';

/** A full-width clickable list row: icon, title with detail line, status badge. */
export function ListRow({
  href,
  icon: Icon = FileText,
  title,
  detail,
  badge,
}: {
  href: string;
  icon?: LucideIcon;
  title: string;
  detail: ReactNode;
  badge: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex w-full items-center gap-2.5 rounded-md border border-border bg-card px-3 py-4 text-left text-foreground transition-colors not-first:mt-2.5 hover:bg-muted sm:gap-3.5 sm:px-4 sm:py-4.5"
    >
      <span className="grid h-9.5 w-8.5 shrink-0 place-items-center rounded-xs border border-border bg-background text-brand-400">
        <Icon size={19} aria-hidden />
      </span>
      <span className="flex-1">
        <strong className="mb-1 block text-sm font-medium">{title}</strong>
        <small className="text-2xs text-muted-foreground">{detail}</small>
      </span>
      {badge}
      <ChevronRight
        size={17}
        aria-hidden
        className="ml-0.5 shrink-0 text-subtle-foreground sm:ml-4.5"
      />
    </Link>
  );
}
