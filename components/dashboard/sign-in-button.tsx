import { useTransition } from "react";
import { Loader2 } from "lucide-react";

function SteamIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden>
      <path d="M16 0C7.2 0 .1 7 .1 15.6l8.5 3.5c.7-.5 1.6-.8 2.6-.8h.2l3.8-5.5v-.1c0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6h-.1l-5.4 3.9v.2c0 2.5-2 4.5-4.5 4.5-2.2 0-4-1.5-4.4-3.6L2.6 21C4.7 27.3 9.8 32 16 32c8.8 0 16-7.2 16-16S24.8 0 16 0zm-6 24.4l-2-.8c.3.7.9 1.3 1.7 1.6 1.7.7 3.6-.1 4.3-1.8.3-.8.3-1.7 0-2.5s-.9-1.4-1.7-1.8c-.8-.3-1.6-.3-2.4 0l2 .8c1.2.5 1.8 1.9 1.3 3.1s-1.9 1.8-3.2 1.4zm12.7-9.3c0-2.2-1.8-4-4-4s-4 1.8-4 4 1.8 4 4 4 4-1.8 4-4zm-7 0c0-1.7 1.3-3 3-3s3 1.3 3 3-1.3 3-3 3-3-1.3-3-3z" />
    </svg>
  );
}

export function SignInButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <a
      href="/auth/steam"
      onClick={() => {
        if (!isPending) {
          startTransition(() => {});
        }
      }}
      className={
        "inline-flex items-center gap-3 rounded-lg bg-foreground px-6 py-3 text-sm font-semibold text-background transition-all hover:bg-foreground/85" +
        (isPending ? " pointer-events-none opacity-60" : "")
      }
    >
      {isPending ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Redirecting to Steam...
        </>
      ) : (
        <>
          <SteamIcon className="h-5 w-5" />
          Sign in through Steam
        </>
      )}
    </a>
  );
}
