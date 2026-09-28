import type { ReactNode } from "react";
import type { PublicCareer } from "../../careers/types.js";
import {
  ArtifactStage,
  ChapterSeparator,
  PublicChapter,
  useChapterReveal,
} from "../ArtDirection.js";
import { productMedia, selectProductMedia } from "../productMedia.js";
import type { ProductMediaId } from "../productMedia.js";
import { SiteLink } from "../SiteLink.js";
import "./CyberDetail.css";

function Motion({ kind, children }: { kind: string; children: ReactNode }) {
  const ref = useChapterReveal<HTMLDivElement>();
  return (
    <div ref={ref} data-motion={kind}>
      {children}
    </div>
  );
}

/** Public proof is static. Theme and device choices come from the audited registry. */
function ProductImage({
  id,
  alt,
  desktopOnly = false,
}: {
  id: ProductMediaId;
  alt: string;
  desktopOnly?: boolean;
}) {
  const darkDesktop = selectProductMedia(id, "dark", "desktop");
  const lightDesktop = selectProductMedia(id, "light", "desktop");
  const darkMobile = desktopOnly
    ? darkDesktop
    : selectProductMedia(id, "dark", "mobile");
  const lightMobile = desktopOnly
    ? lightDesktop
    : selectProductMedia(id, "light", "mobile");
  const picture = (
    theme: "dark" | "light",
    desktop: typeof darkDesktop,
    mobile: typeof darkMobile,
  ) => (
    <picture className={"cyber-product-image cyber-product-image--" + theme}>
      {mobile.src !== desktop.src ? (
        <source media="(max-width: 600px)" srcSet={mobile.src} />
      ) : null}
      <img
        src={desktop.src}
        alt={alt}
        loading={id === "a-11" ? "eager" : "lazy"}
        decoding="async"
      />
    </picture>
  );
  return (
    <span
      className="cyber-product-frame"
      data-media-id={id}
      data-authenticity={productMedia[id].authenticity}
    >
      {picture("dark", darkDesktop, darkMobile)}
      {lightDesktop.src !== darkDesktop.src ||
      lightMobile.src !== darkMobile.src
        ? picture("light", lightDesktop, lightMobile)
        : null}
    </span>
  );
}

function ProofCaption({
  id,
  children,
}: {
  id: ProductMediaId;
  children: ReactNode;
}) {
  return (
    <p className="cyber-proof-caption">
      <span>{children}</span>
      <span>
        {productMedia[id].authenticity === "real"
          ? "Real product capture"
          : "Representative product state"}
      </span>
    </p>
  );
}

function ShiftMeta({ children }: { children: ReactNode }) {
  return (
    <p className="cyber-shift-meta">
      First shift <span aria-hidden="true">/</span> {children}
    </p>
  );
}

export function CyberDetail({ career }: { career: PublicCareer }) {
  return (
    <article className="career-detail cyber-detail">
      <SiteLink to="/careers" className="career-back-link">
        ← All careers
      </SiteLink>

      <header className="cyber-hero">
        <div className="cyber-hero-copy">
          <ShiftMeta>Arrival at Verdaly</ShiftMeta>
          <h1>{career.title}</h1>
          <p className="cyber-hero-lede">
            Your first shift begins inside a security operations center, with a
            case already open.
          </p>
          <p>{career.workplaceSummary}</p>
          <SiteLink className="start-shift" to="/start">
            Begin your first day
          </SiteLink>
        </div>
        <figure className="cyber-arrival-proof">
          <ProductImage
            id="a-11"
            alt="Verdaly security operations center as it appears in the first shift"
          />
          <ProofCaption id="a-11">The workplace you enter</ProofCaption>
        </figure>
        <div className="cyber-desk-peek">
          <span>From the floor to your desk</span>
          <div className="cyber-desk-crop">
            <ProductImage
              id="a-12"
              alt="Current Desk OS showing the open handoff and main case"
              desktopOnly
            />
          </div>
          <ProofCaption id="a-12">
            Desk OS at the start of the shift
          </ProofCaption>
        </div>
      </header>

      <ChapterSeparator />
      <PublicChapter
        surface="chapter"
        rhythm="standard"
        className="cyber-handoff"
      >
        <Motion kind="chapter-reveal">
          <div className="ui-editorial-split">
            <div data-motion-role="argument">
              <ShiftMeta>Handoff</ShiftMeta>
              <h2>The shift starts before you do.</h2>
              <p>
                The night analyst leaves an unfamiliar login open, a device
                check unfinished, and a question for the next person at the
                desk.
              </p>
            </div>
            <figure data-motion-role="artifact">
              <ProductImage
                id="a-08"
                alt="Night analyst handoff message naming the unfinished login investigation"
              />
              <ProofCaption id="a-08">The handoff you read</ProofCaption>
            </figure>
          </div>
        </Motion>
      </PublicChapter>

      <ChapterSeparator />
      <PublicChapter surface="stage" rhythm="stage" className="cyber-alert">
        <ShiftMeta>A-1042</ShiftMeta>
        <div className="cyber-alert-intro">
          <h2>An alert is only the beginning.</h2>
          <p>
            A high severity sign-in signal starts the case. It does not
            establish who controlled the session.
          </p>
        </div>
        <ArtifactStage
          dominant={
            <ProductImage
              id="a-01"
              alt="Real A-1042 sign-in monitoring alert with source references and open state"
            />
          }
          emphasis="center"
          className="cyber-alert-stage"
        />
        <ProofCaption id="a-01">
          A-1042 · open sign-in monitoring alert
        </ProofCaption>
      </PublicChapter>

      <ChapterSeparator />
      <PublicChapter
        surface="base"
        rhythm="expansive"
        className="cyber-records"
      >
        <Motion kind="artifact-gather">
          <ShiftMeta>Check the records</ShiftMeta>
          <h2>One case. Four separate records.</h2>
          <p className="cyber-section-intro">
            The timeline, inventory, account history, and VPN context each
            answer a different question. You assemble what they support.
          </p>
          <div className="cyber-record-composition">
            <div
              className="cyber-record cyber-record--timeline"
              data-motion-role="secondary"
            >
              <ProductImage
                id="a-02"
                alt="Sign-in timeline for the session under review"
              />
              <ProofCaption id="a-02">Sign-in timeline</ProofCaption>
            </div>
            <div
              className="cyber-record cyber-record--device"
              data-motion-role="secondary"
            >
              <ProductImage
                id="a-03"
                alt="Device inventory record for the unfamiliar laptop"
              />
              <ProofCaption id="a-03">Device inventory</ProofCaption>
            </div>
            <div
              className="cyber-record cyber-record--account"
              data-motion-role="secondary"
            >
              <ProductImage
                id="a-04"
                alt="Account history opened during the investigation"
              />
              <ProofCaption id="a-04">Account history</ProofCaption>
            </div>
            <div
              className="cyber-record cyber-record--vpn"
              data-motion-role="secondary"
            >
              <ProductImage
                id="a-05"
                alt="VPN record used to check the sign-in context"
              />
              <ProofCaption id="a-05">VPN context</ProofCaption>
            </div>
            <div className="cyber-record-center" data-motion-role="link">
              <span>A-1042</span>
              <strong>What does the evidence support?</strong>
            </div>
          </div>
        </Motion>
      </PublicChapter>

      <ChapterSeparator />
      <PublicChapter
        surface="finale"
        rhythm="standard"
        className="cyber-judgment"
      >
        <Motion kind="evidence-link">
          <ShiftMeta>Make the call</ShiftMeta>
          <h2>You will never have all the evidence.</h2>
          <p data-motion-role="link">
            You decide anyway — and say what you’re still unsure of.
          </p>
          <span className="cyber-judgment-rule" aria-hidden="true" />
          <p className="cyber-judgment-small">
            An alert is a signal to verify. A network address is not proof of
            identity.
          </p>
        </Motion>
      </PublicChapter>

      <ChapterSeparator />
      <PublicChapter
        surface="chapter"
        rhythm="expansive"
        className="cyber-interruptions"
      >
        <ShiftMeta>The shift moves</ShiftMeta>
        <h2>While you investigate, other work arrives.</h2>
        <p className="cyber-section-intro">
          A scanner record needs comparison with an approved window. Morgan asks
          for a status update on the login. The queue does not pause for a neat
          ending.
        </p>
        <div className="cyber-interruption-strip">
          <figure>
            <ProductImage
              id="a-09"
              alt="Scanner record being compared with the approved maintenance window"
            />
            <ProofCaption id="a-09">Scanner comparison</ProofCaption>
          </figure>
          <figure>
            <ProductImage
              id="a-07"
              alt="Morgan status conversation open beside the active investigation"
            />
            <ProofCaption id="a-07">Morgan asks for status</ProofCaption>
          </figure>
        </div>
      </PublicChapter>

      <ChapterSeparator />
      <PublicChapter
        surface="stage"
        rhythm="standard"
        className="cyber-leave-record"
      >
        <Motion kind="handoff-pass">
          <div className="ui-editorial-split ui-editorial-split--reverse">
            <div className="cyber-ticket-proof">
              <ProductImage
                id="a-06"
                alt="Representative investigation ticket with evidence, uncertainty, and a next step"
              />
              <ProofCaption id="a-06">
                Investigation ticket with working notes
              </ProofCaption>
              <span
                className="cyber-handoff-trace"
                data-motion-role="document"
                aria-hidden="true"
              />
            </div>
            <div>
              <ShiftMeta>Leave the record</ShiftMeta>
              <h2>The work isn’t done until someone else can continue it.</h2>
              <p>
                Record the verified facts, name what remains open, and leave a
                next step. The ticket shown is a representative in-product
                state, not proof of a completed shift.
              </p>
            </div>
          </div>
        </Motion>
      </PublicChapter>

      <ChapterSeparator />
      <PublicChapter surface="base" rhythm="standard" className="cyber-reflect">
        <Motion kind="debrief-assemble">
          <div className="ui-editorial-split">
            <div data-motion-role="evidence">
              <ShiftMeta>Reflect</ShiftMeta>
              <h2>See how you worked — not a score of who you are.</h2>
              <p>
                A debrief can put your actions beside the limits of what one
                short shift can show. This image is a representative
                partial-shift state.
              </p>
            </div>
            <figure data-motion-role="consequence">
              <ProductImage
                id="a-10"
                alt="Representative partial-shift debrief showing actions and limitations"
              />
              <ProofCaption id="a-10">Partial-shift debrief</ProofCaption>
            </figure>
          </div>
        </Motion>
      </PublicChapter>

      <ChapterSeparator />
      <PublicChapter
        surface="chapter"
        rhythm="compact"
        className="cyber-reality"
      >
        <h2>Closer to the work</h2>
        <div className="cyber-reality-lines">
          <p>
            <strong>Not hacking back.</strong>{" "}
            {career.misconceptions?.[0]?.correction}
          </p>
          <p>
            <strong>Not a confirmed compromise.</strong>{" "}
            {career.misconceptions?.[1]?.correction}
          </p>
          <p>
            <strong>Not only emergencies.</strong> {career.realityNotes?.[0]}{" "}
            {career.realityNotes?.[1]}
          </p>
        </div>
        <details className="cyber-how-we-know">
          <summary>How we know</summary>
          <p>
            These images come from a seeded Career Expo first shift at Verdaly.
            The ticket and debrief are representative product states. The
            experience samples selected tasks; it is not a career fit score or
            hiring assessment.
          </p>
        </details>
      </PublicChapter>

      <PublicChapter surface="finale" rhythm="final" className="cyber-final">
        <ShiftMeta>Your first shift</ShiftMeta>
        <h2>Pick up the handoff.</h2>
        <p>
          Work the open case, make a bounded call, and leave the next analyst a
          usable record.
        </p>
        <SiteLink className="start-shift" to="/start">
          Start your first shift <span aria-hidden="true">↗</span>
        </SiteLink>
      </PublicChapter>
    </article>
  );
}
