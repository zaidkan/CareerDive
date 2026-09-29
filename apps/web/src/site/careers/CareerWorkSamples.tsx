/** Verbatim excerpts from the approved Cybersecurity pack; synthetic work records. */
export function HandoffExcerpt() {
  return (
    <figure className="shift-handoff">
      <figcaption>
        <strong>Night analyst handoff</strong>
        <span>07:55</span>
      </figcaption>
      <blockquote>
        Still watching the unfamiliar login thread. Did not finish device
        inventory check.
      </blockquote>
      <p>
        For the next analyst: A-1042 is the open sign-in item. The location
        estimate is only a lead; I have not confirmed who signed in.
      </p>
      <small>Excerpt from the simulation’s synthetic handoff</small>
    </figure>
  );
}

export function ShiftDeskPreview() {
  return (
    <figure className="shift-desk-preview">
      <picture className="shift-desk-dark">
        <source
          media="(max-width: 600px)"
          srcSet="/careers/verdaly-alert-dark-mobile.webp"
          width="654"
          height="480"
        />
        <img
          src="/careers/verdaly-alert-dark.webp"
          alt="Career Expo’s A-1042 record: repeated identity-check failures followed by a successful sign-in from an unfamiliar device."
          width="1440"
          height="1000"
        />
      </picture>
      <picture className="shift-desk-light">
        <source
          media="(max-width: 600px)"
          srcSet="/careers/verdaly-alert-light-mobile.webp"
          width="654"
          height="480"
        />
        <img
          src="/careers/verdaly-alert-light.webp"
          alt="Career Expo’s A-1042 record: repeated identity-check failures followed by a successful sign-in from an unfamiliar device."
          width="1440"
          height="1000"
        />
      </picture>
      <figcaption>
        <strong>Alert record · A-1042</strong>
        <span>Actual product capture · synthetic records</span>
      </figcaption>
    </figure>
  );
}

export function InvestigationExcerpt() {
  return (
    <figure className="shift-investigation">
      <figcaption>
        <strong>Investigation ticket</strong>
        <span>What the next analyst needs</span>
      </figcaption>
      <dl>
        <div>
          <dt>Verified evidence</dt>
          <dd>
            Cite the alert and exact device record you checked. Keep the
            employee's account in their own terms.
          </dd>
        </div>
        <div>
          <dt>Uncertainty</dt>
          <dd>
            Distinguish the location estimate and working explanation from what
            is independently supported.
          </dd>
        </div>
        <div>
          <dt>Next step</dt>
          <dd>
            Name the review you are requesting and the question it should
            resolve.
          </dd>
        </div>
      </dl>
      <small>Excerpt from the simulation’s ticket instructions</small>
    </figure>
  );
}
