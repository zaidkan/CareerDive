import type { AnchorHTMLAttributes, ReactNode } from "react";
import { navigate, type SiteRoute } from "./routes.js";

type SiteLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "onClick"
> & {
  to: SiteRoute;
  children: ReactNode;
};

export function SiteLink({ to, children, ...rest }: SiteLinkProps) {
  return (
    <a
      href={to}
      onClick={(event) => {
        event.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
