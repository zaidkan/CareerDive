import { WorkshopSheet } from "./WorkshopSheet.js";

/** Matter posture sheet; parties appear by role only. */
export function LawyerCaseFactSheet() {
  return (
    <WorkshopSheet
      id="law-facts"
      career="Lawyer"
      kicker="Case fact sheet"
      name="ARB-2026-114 · posture"
      stamp="Matter sheet MS-114"
    >
      <p className="wa-lede">
        Parties appear by role only — no personal details in this sample.
      </p>
      <dl className="wa-rows">
        <dt>Parties</dt>
        <dd>Claimant (supplier) v. Respondent (distributor)</dd>
        <dt>Agreement</dt>
        <dd>Supply agreement dated 2024-03-11</dd>
        <dt>Dispute</dt>
        <dd>Late-delivery credits and defect deductions</dd>
        <dt>Next date</dt>
        <dd>Witness list exchange · 2026-10-02</dd>
        <dt>Posture</dt>
        <dd>Document disclosure complete · hearing set</dd>
      </dl>
    </WorkshopSheet>
  );
}

/** Contract clause shown with strikethrough removals and underlined proposals. */
export function LawyerRedline() {
  return (
    <WorkshopSheet
      id="law-redline"
      career="Lawyer"
      kicker="Redline"
      name="Clause 7.2 · limitation of liability"
      stamp="Mark-up v4 · counterparty"
    >
      <p className="wa-clause">
        <span className="wa-clause-no">7.2</span> Neither party shall be liable
        for indirect or consequential damages,{" "}
        <del>except in cases of gross negligence</del>{" "}
        <ins>
          except in cases of gross negligence or willful misconduct
        </ins>
        , and <del>either party</del> <ins>the non-breaching party</ins> may
        recover <del>direct damages only</del>{" "}
        <ins>direct damages capped at the fees paid in the prior twelve months</ins>
        .
      </p>
      <p className="wa-meta">struck = removed · underlined = proposed</p>
    </WorkshopSheet>
  );
}

/** Issue-first research note against synthetic authorities. */
export function LawyerResearchNote() {
  return (
    <WorkshopSheet
      id="law-research"
      career="Lawyer"
      kicker="Research note"
      name="Force majeure read-through"
      stamp="Note RN-27 · internal"
    >
      <dl className="wa-rows">
        <dt>Issue</dt>
        <dd>Whether supply-chain delay excuses the delivery credits.</dd>
        <dt>Authority</dt>
        <dd>
          Hawthorn v. Calder, 412 Mass. 88 (2024) · synthetic citation
        </dd>
        <dt>Holding</dt>
        <dd>Foreseeable congestion is not a force majeure event.</dd>
        <dt>Use</dt>
        <dd>Distinguish · cite for the foreseeability test.</dd>
      </dl>
    </WorkshopSheet>
  );
}

/** Hearing outline mapping each issue to an authority. */
export function LawyerIssueAuthorityMatrix() {
  return (
    <WorkshopSheet
      id="law-matrix"
      career="Lawyer"
      kicker="Issue / authority matrix"
      name="Hearing outline"
      stamp="Matrix MX-114 · 4 issues"
    >
      <div className="wa-scroll">
        <table className="wa-table">
          <caption className="visually-hidden">
            Issues mapped to authorities for the hearing outline
          </caption>
          <thead>
            <tr>
              <th scope="col">Issue</th>
              <th scope="col">Authority</th>
              <th scope="col">Weight</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="wa-key">Delay credits</td>
              <td>Hawthorn v. Calder</td>
              <td>
                <span className="wa-chip wa-chip--ok">Direct</span>
              </td>
            </tr>
            <tr>
              <td className="wa-key">Defect deductions</td>
              <td>Model supply rules § 4.1</td>
              <td>
                <span className="wa-chip wa-chip--warn">Distinguish</span>
              </td>
            </tr>
            <tr>
              <td className="wa-key">Interest &amp; costs</td>
              <td>Panel practice note 6</td>
              <td>
                <span className="wa-chip wa-chip--info">Reference</span>
              </td>
            </tr>
            <tr>
              <td className="wa-key">Attorneys&rsquo; fees</td>
              <td>Agreement cl. 11.3</td>
              <td>
                <span className="wa-chip wa-chip--ok">Direct</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </WorkshopSheet>
  );
}
