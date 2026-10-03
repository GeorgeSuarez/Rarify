import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FONT_VARIANTS } from "../font-variants.ts";

/**
 * PROTOTYPE (throwaway): floating bottom bar that cycles the `?variant=`
 * search param. Hidden in production builds so a stray merge cannot ship it.
 */
export function PrototypeFontSwitcher({ current }: { readonly current: string }) {
  const [, setSearchParams] = useSearchParams();
  const index = Math.max(
    0,
    FONT_VARIANTS.findIndex((variant) => variant.key === current),
  );
  const active = FONT_VARIANTS[index];

  function goTo(nextIndex: number) {
    const wrapped =
      (nextIndex + FONT_VARIANTS.length) % FONT_VARIANTS.length;
    setSearchParams({ variant: FONT_VARIANTS[wrapped].key }, { replace: true });
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === "ArrowLeft") goTo(index - 1);
      if (event.key === "ArrowRight") goTo(index + 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (import.meta.env.PROD) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/20 bg-black/90 px-2 py-1.5 text-white shadow-xl"
      role="toolbar"
      aria-label="Prototype font switcher"
    >
      <button
        type="button"
        onClick={() => goTo(index - 1)}
        aria-label="Previous font"
        className="rounded-full p-1.5 hover:bg-white/15"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>
      <span
        className="min-w-44 px-1 text-center text-xs font-medium"
        title={active.blurb}
      >
        {active.key} · {active.name}
      </span>
      <button
        type="button"
        onClick={() => goTo(index + 1)}
        aria-label="Next font"
        className="rounded-full p-1.5 hover:bg-white/15"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
