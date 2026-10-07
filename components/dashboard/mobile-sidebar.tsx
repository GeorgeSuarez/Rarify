import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarContent } from "@/components/dashboard/sidebar";

export function MobileSidebar({
  user,
  activeHref,
}: {
  user?: { personaName: string; avatar: string };
  activeHref?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative shrink-0 touch-manipulation select-none after:absolute after:inset-[min(0px,(100%-44px)/2)] after:content-[''] lg:hidden"
            aria-label="Open navigation menu"
          />
        }
      >
        <Menu className="size-5 shrink-0" aria-hidden />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 border-r border-sidebar-border bg-sidebar p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SidebarContent user={user} activeHref={activeHref} />
      </SheetContent>
    </Sheet>
  );
}
