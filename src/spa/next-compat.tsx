import type { AnchorHTMLAttributes, CSSProperties, ReactNode } from "react";
import { Link as RouterLink } from "react-router";

/**
 * Image element that preserves the call sites written for `next/image`.
 *
 * The SPA serves Steam CDN images directly, so optimization props are accepted
 * for source compatibility but intentionally ignored.
 */
export function Image({
  src,
  alt,
  fill = false,
  priority = false,
  sizes,
  className,
  fetchPriority,
}: {
  readonly src: string;
  readonly alt: string;
  readonly fill?: boolean;
  readonly priority?: boolean;
  readonly sizes?: string;
  readonly className?: string;
  readonly fetchPriority?: "high" | "low" | "auto";
}) {
  const style: CSSProperties | undefined = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%" }
    : undefined;
  return (
    <img
      src={src}
      alt={alt}
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={fetchPriority}
      className={className}
      style={style}
    />
  );
}

/**
 * Router link that preserves the `next/link` call sites used by the dashboard.
 */
export function Link({
  href,
  children,
  ...rest
}: {
  readonly href: string;
  readonly children: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <RouterLink to={href} {...rest}>
      {children}
    </RouterLink>
  );
}
