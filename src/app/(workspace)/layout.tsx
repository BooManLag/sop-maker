import type { ReactNode } from 'react';
import { SidebarContent } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { BottomNav, MobileHeader } from '@/components/layout/mobile-nav';
import { BusyIndicator } from '@/components/layout/busy-indicator';

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[205px] border-r border-border bg-sidebar md:block lg:w-[237px]">
        <SidebarContent />
      </aside>
      <div className="min-w-0 flex-1 md:ml-[205px] lg:ml-[237px]">
        <MobileHeader />
        <Topbar />
        <main className="mx-auto max-w-[1490px] px-4 pt-6 pb-25 md:px-7.5 md:py-8 lg:px-11.5 lg:pt-11 lg:pb-16 xl:pt-14.5">
          {children}
        </main>
      </div>
      <BottomNav />
      <BusyIndicator />
    </div>
  );
}
