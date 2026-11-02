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
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys, useWorkspace, useWorkspaceMutation } from '@/lib/client/queries';
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
  const queryClient = useQueryClient();
  // Drop the deleted process from the cache and leave before the refresh, so nothing refetches it.
  const remove = useWorkspaceMutation(
    () => api.deleteProcess(process.id),
    () => {
      queryClient.removeQueries({ queryKey: queryKeys.process(process.id) });
      router.push('/processes');
    },
  );
  const admin = useWorkspace().data?.role === 'admin';
  const [purging, setPurging] = useState(false);
  const [typedTitle, setTypedTitle] = useState('');
  const purge = useWorkspaceMutation(
    () => api.purgeProcess(process.id, typedTitle),
    () => {
      queryClient.removeQueries({ queryKey: queryKeys.process(process.id) });
      router.push('/processes');
    },
  );
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setConfirming(false);
        setPurging(false);
        setTypedTitle('');
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
          {admin && published && (
            <div className="flex flex-col gap-3 border-t border-border pt-6">
              <h4 className="m-0 text-destructive">Delete permanently</h4>
              <p className="m-0 text-sm text-muted-foreground">
                Removes the process, every version, its captures, scans, findings, trials and change
                requests, and its stored pictures and recordings. This cannot be undone.
              </p>
              <ErrorBanner error={purge.error} onDismiss={purge.reset} />
              {purging ? (
                <div className="flex flex-col gap-2">
                  <label className="text-sm" htmlFor="purge-title">
                    Type <strong>{process.title}</strong> to confirm
                  </label>
                  <Input
                    id="purge-title"
                    autoComplete="off"
                    value={typedTitle}
                    onChange={(event) => setTypedTitle(event.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      className="border-destructive bg-destructive hover:bg-destructive/90"
                      disabled={purge.isPending || typedTitle !== process.title}
                      onClick={() => purge.mutate(undefined)}
                    >
                      {purge.isPending ? 'Deleting…' : 'Delete forever'}
                    </Button>
                    <Button variant="secondary" onClick={() => setPurging(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="secondary" onClick={() => setPurging(true)}>
                  Delete permanently…
                </Button>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
