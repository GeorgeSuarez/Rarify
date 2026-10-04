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
            className="lg:hidden"
            aria-label="Open navigation menu"
          />
        }
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 border-r border-sidebar-border bg-sidebar p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SidebarContent user={user} activeHref={activeHref} />
      </SheetContent>
    </Sheet>
  );
}
