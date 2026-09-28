import { WorkshopSheet } from "./WorkshopSheet.js";

/** Single-line diagram of a synthetic subpanel feed. */
export function ElectricianWiringSchematic() {
  return (
    <WorkshopSheet
      id="elec-schematic"
      career="Electrician"
      kicker="Wiring schematic"
      name="Panel L2 · single-line"
      stamp="One-line · 200 A main"
    >
      <figure className="wa-figure">
        <svg
          viewBox="0 0 320 190"
          role="img"
          aria-label="Single-line diagram: utility feed to a 200 amp main breaker, feeding three branch circuits — 20 amp receptacles, 20 amp lighting, 30 amp air handler"
        >
          <rect className="wa-svg-fill" x="6" y="86" width="48" height="28" />
          <text className="wa-svg-label" x="30" y="104" textAnchor="middle">Utility</text>
          <line className="wa-svg-line" x1="54" y1="100" x2="96" y2="100" />
          <rect className="wa-svg-fill" x="96" y="82" width="58" height="36" />
          <text className="wa-svg-label wa-svg-label--key" x="125" y="97" textAnchor="middle">200 A</text>
          <text className="wa-svg-label wa-svg-label--mute" x="125" y="111" textAnchor="middle">MAIN</text>
          <line className="wa-svg-live" x1="154" y1="40" x2="154" y2="160" />
          <line className="wa-svg-line" x1="154" y1="48" x2="194" y2="48" />
          <text className="wa-svg-label wa-svg-label--mute" x="194" y="34">L2-1</text>
          <rect className="wa-svg-node" x="194" y="38" width="54" height="20" />
          <text className="wa-svg-label wa-svg-label--key" x="221" y="52" textAnchor="middle">20 A</text>
          <text className="wa-svg-label" x="254" y="52">Recepts</text>
          <line className="wa-svg-line" x1="154" y1="100" x2="194" y2="100" />
          <text className="wa-svg-label wa-svg-label--mute" x="194" y="86">L2-3</text>
          <rect className="wa-svg-node" x="194" y="90" width="54" height="20" />
          <text className="wa-svg-label wa-svg-label--key" x="221" y="104" textAnchor="middle">20 A</text>
          <text className="wa-svg-label" x="254" y="104">Lighting</text>
          <line className="wa-svg-line" x1="154" y1="152" x2="194" y2="152" />
          <text className="wa-svg-label wa-svg-label--mute" x="194" y="138">L2-5</text>
          <rect className="wa-svg-node" x="194" y="142" width="54" height="20" />
          <text className="wa-svg-label wa-svg-label--key" x="221" y="156" textAnchor="middle">30 A</text>
          <text className="wa-svg-label" x="254" y="156">Air handler</text>
          <text className="wa-svg-label wa-svg-label--mute" x="314" y="182" textAnchor="end">SYNTHETIC · NOT FOR CONSTRUCTION</text>
        </svg>
        <figcaption>
          <span>208Y/120 V · three-phase</span>
          <span>Scale-free one-line</span>
        </figcaption>
      </figure>
    </WorkshopSheet>
  );
}

/** Panel directory with circuit loads. */
export function ElectricianCircuitSchedule() {
  return (
    <WorkshopSheet
      id="elec-schedule"
      career="Electrician"
      kicker="Circuit schedule"
      name="Panel L2 directory"
      stamp="Schedule PL-2 · 12 slots"
    >
      <div className="wa-scroll">
        <table className="wa-table">
          <caption className="visually-hidden">
            Panel L2 circuit directory
          </caption>
          <thead>
            <tr>
              <th scope="col">Slot</th>
              <th scope="col">Circuit</th>
              <th scope="col">Load</th>
              <th scope="col">Phase</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="wa-key">1</td>
              <td>Kitchen recepts</td>
              <td className="wa-num">1.5 kVA</td>
              <td className="wa-key">A</td>
            </tr>
            <tr>
              <td className="wa-key">3</td>
              <td>Living recepts</td>
              <td className="wa-num">2.0 kVA</td>
              <td className="wa-key">B</td>
            </tr>
            <tr>
              <td className="wa-key">5</td>
              <td>Lighting · south</td>
              <td className="wa-num">0.9 kVA</td>
              <td className="wa-key">A</td>
            </tr>
            <tr>
              <td className="wa-key">7</td>
              <td>Lighting · north</td>
              <td className="wa-num">0.8 kVA</td>
              <td className="wa-key">B</td>
            </tr>
            <tr>
              <td className="wa-key">9</td>
              <td>Air handler</td>
              <td className="wa-num">2.4 kVA</td>
              <td className="wa-key">A</td>
            </tr>
            <tr>
              <td className="wa-key">11</td>
              <td>Laundry recepts</td>
              <td className="wa-num">1.8 kVA</td>
              <td className="wa-key">B</td>
            </tr>
          </tbody>
        </table>
      </div>
    </WorkshopSheet>
  );
}

/** Measured troubleshooting log for a dead circuit. */
export function ElectricianTroubleshootingNote() {
  return (
    <WorkshopSheet
      id="elec-troubleshoot"
      career="Electrician"
      kicker="Troubleshooting note"
      name="L2-4 dead receptacles"
      stamp="Service log SL-4471"
    >
      <p className="wa-lede">
        Each step records what was measured before what was changed.
      </p>
      <ul className="wa-log">
        <li>
          <span className="wa-when">14:02</span>
          <span className="wa-what">
            Measured L2-4 to neutral: <strong>0 V</strong> at the device.
          </span>
          <span className="wa-chip wa-chip--risk">Finding</span>
        </li>
        <li>
          <span className="wa-when">14:07</span>
          <span className="wa-what">
            Breaker tested; bus-side voltage <strong>present</strong>.
          </span>
          <span className="wa-chip wa-chip--info">Checked</span>
        </li>
        <li>
          <span className="wa-when">14:15</span>
          <span className="wa-what">
            Loose neutral found at junction <strong>J-9</strong>.
          </span>
          <span className="wa-chip wa-chip--warn">Cause</span>
        </li>
        <li>
          <span className="wa-when">14:22</span>
          <span className="wa-what">
            Re-terminated to screw terminals; retested <strong>120 V</strong>.
          </span>
          <span className="wa-chip wa-chip--ok">Resolved</span>
        </li>
      </ul>
    </WorkshopSheet>
  );
}

/** Post-repair verification steps before re-energizing. */
export function ElectricianVerificationChecklist() {
  return (
    <WorkshopSheet
      id="elec-verify"
      career="Electrician"
      kicker="Verification checklist"
      name="Re-energization · L2-4"
      stamp="Checklist VC-18 · post-repair"
    >
      <p className="wa-lede">
        No re-energizing until the final line is checked.
      </p>
      <ul className="wa-checklist">
        <li>
          <span className="wa-check" aria-hidden="true">✓</span>
          <span className="wa-what">Continuity verified end to end</span>
          <span className="wa-check-when">14:19</span>
        </li>
        <li>
          <span className="wa-check" aria-hidden="true">✓</span>
          <span className="wa-what">Polarity tested at every device</span>
          <span className="wa-check-when">14:20</span>
        </li>
        <li>
          <span className="wa-check" aria-hidden="true">✓</span>
          <span className="wa-what">Terminations torqued to 18 in-lb</span>
          <span className="wa-check-when">14:21</span>
        </li>
        <li>
          <span className="wa-check wa-check--pending" aria-hidden="true">…</span>
          <span className="wa-what">Arc-fault trip test witnessed</span>
          <span className="wa-check-when">Pending</span>
        </li>
      </ul>
    </WorkshopSheet>
  );
}
