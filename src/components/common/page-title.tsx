import type { ReactNode } from 'react';
import { Eyebrow } from './eyebrow';

export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mt-5.5 mb-7.5 flex flex-col items-start gap-4.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-3.5 mb-3 max-w-[750px] text-2xl leading-[1.13] tracking-[-1.6px] md:text-3xl">
          {title}
        </h1>
        <p className="mb-0 max-w-[670px] text-lead">{description}</p>
      </div>
      {action}
    </div>
  );
}
