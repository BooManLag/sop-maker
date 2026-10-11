import type { ReactNode } from 'react';
import { SidebarContent } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { BusyIndicator } from '@/components/layout/busy-indicator';

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[185px] border-r border-border bg-sidebar sm:block md:w-[205px] lg:w-[237px]">
        <SidebarContent />
      </aside>
      <div className="min-w-0 flex-1 sm:ml-[185px] md:ml-[205px] lg:ml-[237px]">
        <Topbar />
        <main className="mx-auto min-h-[calc(100vh-122px)] max-w-[1490px] px-5 py-7.5 sm:px-6 md:px-7.5 md:py-8 lg:px-11.5 lg:pt-11 lg:pb-7.5 xl:pt-14.5">
          {children}
        </main>
        <footer className="mx-auto flex max-w-[1490px] justify-between gap-4 border-t border-border px-5 py-5 text-2xs text-subtle-foreground sm:px-6 lg:px-11.5">
          <span className="font-semibold text-brand-400">good exception.</span>
          <span className="max-md:hidden">Create the standard. Improve it with evidence.</span>
          <span>Demo · Human approval, always</span>
        </footer>
      </div>
      <BusyIndicator />
    </div>
  );
}
