import { WorkshopSheet } from "./WorkshopSheet.js";

/** Annotated top-view drawing of a synthetic mounting bracket. */
export function MechanicalAnnotatedDrawing() {
  return (
    <WorkshopSheet
      id="mech-drawing"
      career="Mechanical Engineer"
      kicker="Annotated drawing"
      name="MB-204 bracket · top view"
      stamp="DWG MB-204 · Rev C"
    >
      <figure className="wa-figure">
        <svg
          viewBox="0 0 320 170"
          role="img"
          aria-label="Top view of bracket MB-204: 180 millimeter plate, two 14 millimeter holes, datum A on the left edge"
        >
          <rect className="wa-svg-fill" x="70" y="48" width="170" height="84" />
          <circle className="wa-svg-node" cx="104" cy="76" r="11" />
          <circle className="wa-svg-node" cx="206" cy="104" r="11" />
          <rect className="wa-svg-node" x="138" y="78" width="36" height="26" rx="13" />
          <line className="wa-svg-lead" x1="98" y1="68" x2="30" y2="30" />
          <text className="wa-svg-label wa-svg-label--key" x="8" y="26">2× ⌀14 H7</text>
          <rect className="wa-svg-lead" x="44" y="90" width="16" height="14" />
          <line className="wa-svg-lead" x1="60" y1="97" x2="70" y2="97" />
          <text className="wa-svg-label" x="49" y="101">A</text>
          <line className="wa-svg-lead" x1="70" y1="132" x2="70" y2="158" />
          <line className="wa-svg-lead" x1="240" y1="132" x2="240" y2="158" />
          <line className="wa-svg-line" x1="70" y1="152" x2="240" y2="152" />
          <line className="wa-svg-line" x1="70" y1="147" x2="70" y2="157" />
          <line className="wa-svg-line" x1="240" y1="147" x2="240" y2="157" />
          <text className="wa-svg-label wa-svg-label--key" x="155" y="145" textAnchor="middle">180</text>
          <text className="wa-svg-label wa-svg-label--mute" x="312" y="164" textAnchor="end">DIMENSIONS MM</text>
        </svg>
        <figcaption>
          <span>Scale 1:2 · synthetic drawing</span>
          <span>Not for construction</span>
        </figcaption>
      </figure>
    </WorkshopSheet>
  );
}

/** Inspection limits against measured values for one synthetic lot. */
export function MechanicalToleranceCallout() {
  return (
    <WorkshopSheet
      id="mech-tolerance"
      career="Mechanical Engineer"
      kicker="Tolerance callout"
      name="Key features · fit limits"
      stamp="Inspection plan IP-118"
    >
      <p className="wa-lede">
        Measured values from one synthetic inspection lot.
      </p>
      <div className="wa-scroll">
        <table className="wa-table">
          <caption className="visually-hidden">
            Feature tolerances and measured results
          </caption>
          <thead>
            <tr>
              <th scope="col">Feature</th>
              <th scope="col">Spec</th>
              <th scope="col">Measured</th>
              <th scope="col">Verdict</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="wa-key">Plate length</td>
              <td>180.00 ±0.20</td>
              <td>180.11</td>
              <td>
                <span className="wa-chip wa-chip--ok">Pass</span>
              </td>
            </tr>
            <tr>
              <td className="wa-key">Hole ⌀ (2×)</td>
              <td>14.000 H7</td>
              <td>14.006</td>
              <td>
                <span className="wa-chip wa-chip--ok">Pass</span>
              </td>
            </tr>
            <tr>
              <td className="wa-key">True position</td>
              <td>⌀0.2 Ⓜ</td>
              <td>0.14</td>
              <td>
                <span className="wa-chip wa-chip--ok">Pass</span>
              </td>
            </tr>
            <tr>
              <td className="wa-key">Edge break</td>
              <td>0.3 × 45°</td>
              <td>0.35</td>
              <td>
                <span className="wa-chip wa-chip--warn">Review</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </WorkshopSheet>
  );
}

/** Coupon test results against acceptance limits. */
export function MechanicalTestResult() {
  return (
    <WorkshopSheet
      id="mech-test"
      career="Mechanical Engineer"
      kicker="Test result"
      name="Bend coupon · lot 2214"
      stamp="Lab sheet LS-2214"
    >
      <p className="wa-lede">
        Lot accepted for pilot build; coupons retained 90 days.
      </p>
      <div className="wa-scroll">
        <table className="wa-table">
          <caption className="visually-hidden">
            Mechanical test results for lot 2214
          </caption>
          <thead>
            <tr>
              <th scope="col">Test</th>
              <th scope="col">Result</th>
              <th scope="col">Limit</th>
              <th scope="col">Verdict</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="wa-key">Yield strength</td>
              <td>248 MPa</td>
              <td>≥ 240 MPa</td>
              <td>
                <span className="wa-chip wa-chip--ok">Pass</span>
              </td>
            </tr>
            <tr>
              <td className="wa-key">Tensile strength</td>
              <td>356 MPa</td>
              <td>≥ 340 MPa</td>
              <td>
                <span className="wa-chip wa-chip--ok">Pass</span>
              </td>
            </tr>
            <tr>
              <td className="wa-key">Elongation</td>
              <td>12 %</td>
              <td>≥ 10 %</td>
              <td>
                <span className="wa-chip wa-chip--ok">Pass</span>
              </td>
            </tr>
            <tr>
              <td className="wa-key">Hardness</td>
              <td>92 HRB</td>
              <td>85–95 HRB</td>
              <td>
                <span className="wa-chip wa-chip--ok">Pass</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </WorkshopSheet>
  );
}

/** Engineering change excerpt comparing two revisions. */
export function MechanicalRevisionComparison() {
  return (
    <WorkshopSheet
      id="mech-revision"
      career="Mechanical Engineer"
      kicker="Revision comparison"
      name="Rev C → Rev D"
      stamp="ECO-0912 · pending"
    >
      <div className="wa-scroll">
        <table className="wa-table wa-diff">
          <caption className="visually-hidden">
            Changes between revision C and revision D
          </caption>
          <thead>
            <tr>
              <th scope="col">Area</th>
              <th scope="col">Change</th>
              <th scope="col">State</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="wa-key">Hole pattern</td>
              <td>
                <del>4× ⌀12 at 22 mm</del>{" "}
                <span aria-hidden="true">→</span>{" "}
                <ins>4× ⌀14 at 24 mm</ins>
              </td>
              <td>
                <span className="wa-chip wa-chip--info">Changed</span>
              </td>
            </tr>
            <tr>
              <td className="wa-key">Coating</td>
              <td>
                <del>zinc plate</del>{" "}
                <span aria-hidden="true">→</span>{" "}
                <ins>zinc-nickel plate</ins>
              </td>
              <td>
                <span className="wa-chip wa-chip--info">Changed</span>
              </td>
            </tr>
            <tr>
              <td className="wa-key">Edge break</td>
              <td>0.3 × 45° all edges</td>
              <td>
                <span className="wa-chip wa-chip--mute">Unchanged</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </WorkshopSheet>
  );
}
