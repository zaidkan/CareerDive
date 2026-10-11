import Markdown, { defaultUrlTransform } from "react-markdown";
import { PublicChapter } from "../ArtDirection.js";
import { SiteLink } from "../SiteLink.js";
import privacy from "../legal/privacy.md?raw";
import terms from "../legal/terms.md?raw";
import "./LegalPage.css";

export function LegalPage({ document }: { document: "privacy" | "terms" }) {
  return (
    <article className="legal-page">
      <PublicChapter surface="base" rhythm="standard" width="reading">
        <Markdown
          urlTransform={(url) => {
            if (url === "TERMS.md") return "/terms";
            if (url === "PRIVACY-POLICY.md") return "/privacy";
            return defaultUrlTransform(url);
          }}
          components={{
            a: ({ href, children }) =>
              href === "/terms" || href === "/privacy" ? (
                <SiteLink to={href}>{children}</SiteLink>
              ) : (
                <a href={href}>{children}</a>
              ),
          }}
        >
          {document === "privacy" ? privacy : terms}
        </Markdown>
      </PublicChapter>
    </article>
  );
}
