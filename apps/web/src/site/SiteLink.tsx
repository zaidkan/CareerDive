import type { AnchorHTMLAttributes, ReactNode } from "react";
import { navigate, type SitePath } from "./routes.js";

type SiteLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "onClick"
> & {
  to: SitePath;
  children: ReactNode;
  onNavigate?: () => void;
};

export function SiteLink({ to, children, onNavigate, ...rest }: SiteLinkProps) {
  return (
    <a
      href={to}
      onClick={(event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        onNavigate?.();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
