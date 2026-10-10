'use client';

import { useId } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

/** A labelled value the reviewer can read and copy but not change. Multi-line when `rows` is given. */
export function ReadOnlyField({
  label,
  value,
  rows,
}: {
  label: string;
  value: string;
  rows?: number;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2 text-xs text-foreground-soft">
      <Label htmlFor={id}>{label}</Label>
      {rows ? (
        <Textarea id={id} rows={rows} value={value} readOnly />
      ) : (
        <Input id={id} value={value} readOnly />
      )}
    </div>
  );
}
