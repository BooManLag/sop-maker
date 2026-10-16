'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ellipsis } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/common/error-banner';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { api } from '@/lib/client/browser';
import type { ProcessDto } from '@/lib/client/api';
import { useWorkspaceMutation } from '@/lib/client/queries';
import { shortText } from '@/lib/domain/validation';

const detailsSchema = z.object({ title: shortText, equipment: shortText });
type Details = z.infer<typeof detailsSchema>;

/** Renames a process, and deletes a draft or archives a published one. */
export function ProcessSettings({ process }: { process: ProcessDto }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const published = process.currentVersion > 0;
  const form = useForm<Details>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { title: process.title, equipment: process.equipment },
  });
  const rename = useWorkspaceMutation(
    (values: Details) => api.updateProcess(process.id, values),
    () => setOpen(false),
  );
  // Leave the page before the refresh, so it never refetches a process that is gone.
  const remove = useWorkspaceMutation(
    () => api.deleteProcess(process.id),
    () => router.push('/processes'),
  );
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setConfirming(false);
        if (next) form.reset({ title: process.title, equipment: process.equipment });
      }}
    >
      <SheetTrigger asChild>
        <Button variant="secondary" className="px-3" aria-label="Process settings">
          <Ellipsis size={16} aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Process settings</SheetTitle>
          <SheetDescription>
            {published
              ? 'Renaming keeps the title each published version was approved under.'
              : 'Changes apply to the draft.'}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-8 px-4">
          <Form {...form}>
            <form
              className="flex flex-col gap-4"
              onSubmit={form.handleSubmit((values) => rename.mutate(values))}
            >
              <ErrorBanner error={rename.error} onDismiss={rename.reset} />
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="equipment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipment</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={rename.isPending}>
                {rename.isPending ? 'Saving…' : 'Save'}
              </Button>
            </form>
          </Form>
          <div className="flex flex-col gap-3 border-t border-border pt-6">
            <h4 className="m-0">{published ? 'Archive process' : 'Delete draft'}</h4>
            <p className="m-0 text-sm text-muted-foreground">
              {published
                ? 'The process leaves your lists. Its versions, scans and trials are kept.'
                : 'The draft and its captures are removed, and its recordings expire with draft storage. This cannot be undone.'}
            </p>
            <ErrorBanner error={remove.error} onDismiss={remove.reset} />
            {confirming ? (
              <div className="flex gap-2">
                <Button disabled={remove.isPending} onClick={() => remove.mutate(undefined)}>
                  {remove.isPending ? 'Working…' : published ? 'Yes, archive' : 'Yes, delete'}
                </Button>
                <Button variant="secondary" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="secondary" onClick={() => setConfirming(true)}>
                {published ? 'Archive…' : 'Delete draft…'}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
