import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Eyebrow } from './eyebrow';

export function SectionHeader({
  eyebrow,
  title,
  link,
}: {
  eyebrow?: string;
  title: ReactNode;
  link: { href: string; label: string };
}) {
  return (
    <div className="mb-4.5 flex items-center justify-between gap-4">
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="mt-1 mb-0 text-md tracking-[-0.5px]">{title}</h2>
      </div>
      <Link
        href={link.href}
        className="inline-flex items-center gap-2 text-tiny whitespace-nowrap text-brand-500 hover:text-foreground sm:text-xs"
      >
        {link.label}
        <ArrowUpRight size={15} aria-hidden />
      </Link>
    </div>
  );
}
