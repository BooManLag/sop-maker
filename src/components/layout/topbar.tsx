'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronRight, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, SidebarContent } from './sidebar';
import { sectionFor, sectionLabels } from './sections';

export function Topbar() {
  const section = sectionFor(usePathname());
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="flex h-15.5 items-center justify-between border-b border-border bg-topbar px-5 sm:h-[72px] sm:px-7.5 lg:px-11">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger className="mr-1 text-brand-400 sm:hidden" aria-label="Toggle menu">
            <Menu size={20} />
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[237px] border-border bg-sidebar p-0 shadow-drawer"
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent onNavigate={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>
        <nav aria-label="Breadcrumb" className="flex items-center gap-3">
          <span>Workspace</span>
          <ChevronRight size={13} aria-hidden />
          <strong aria-current="page" className="font-medium text-foreground-soft">
            {sectionLabels[section]}
          </strong>
        </nav>
      </div>
      <div className="flex items-center gap-3 sm:gap-6">
        <span className="flex items-center gap-2 text-2xs text-muted-foreground sm:text-tiny">
          <span aria-hidden className="size-1 rounded-full bg-brand-300" />
          Demo workspace
        </span>
        <Avatar initials="AL" small />
      </div>
    </header>
  );
}
