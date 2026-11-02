import type { ReactNode } from 'react';

export function DefinitionList({ items }: { items: [term: string, detail: ReactNode][] }) {
  return (
    <dl className="mt-5 grid grid-cols-[100px_1fr] gap-3 text-tiny leading-[1.7] sm:grid-cols-[130px_1fr] sm:text-xs">
      {items.map(([term, detail]) => (
        <div key={term} className="contents">
          <dt className="text-brand-400">{term}</dt>
          <dd className="m-0 wrap-anywhere text-brand-500">{detail}</dd>
        </div>
      ))}
    </dl>
  );
}
