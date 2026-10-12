import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function BackLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="mb-4.5 inline-flex items-center gap-2 text-xs text-brand-400 hover:text-foreground"
    >
      <ArrowLeft size={14} aria-hidden />
      Back
    </Link>
  );
}
