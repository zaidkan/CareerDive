import { WorkshopSheet } from "./WorkshopSheet.js";

/** Representative shift-handoff sheet. Synthetic patients identified by bed only. */
export function NurseHandoffSheet() {
  return (
    <WorkshopSheet
      id="nurse-handoff"
      career="Registered Nurse"
      kicker="Shift handoff · SBAR"
      name="4 West · 07:00 report"
      stamp="Form H-204 · Rev 3"
    >
      <p className="wa-lede">
        Report taken at the bedside. Two items need charge-nurse sign-off before
        the night team leaves.
      </p>
      <div className="wa-scroll">
        <table className="wa-table">
          <caption className="visually-hidden">
            Patient handoff rows for the 4 West unit
          </caption>
          <thead>
            <tr>
              <th scope="col">Bed</th>
              <th scope="col">Focus</th>
              <th scope="col">Since</th>
              <th scope="col">Flag</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="wa-key">4A-2</td>
              <td>Post-op day 1 · ambulate with assist</td>
              <td>06:40</td>
              <td>
                <span className="wa-chip wa-chip--ok">Stable</span>
              </td>
            </tr>
            <tr>
              <td className="wa-key">4A-4</td>
              <td>Insulin infusion · recheck at 08:00</td>
              <td>06:52</td>
              <td>
                <span className="wa-chip wa-chip--warn">Watch</span>
              </td>
            </tr>
            <tr>
              <td className="wa-key">4B-1</td>
              <td>Telemetry · brief runs of AF overnight</td>
              <td>06:31</td>
              <td>
                <span className="wa-chip wa-chip--risk">Priority</span>
              </td>
            </tr>
            <tr>
              <td className="wa-key">4B-3</td>
              <td>Culture pending · antibiotic due 10:00</td>
              <td>06:47</td>
              <td>
                <span className="wa-chip wa-chip--info">Due</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </WorkshopSheet>
  );
}

/** Six-hour vitals panel with an inline heart-rate trend. */
export function NurseVitalsTrend() {
  return (
    <WorkshopSheet
      id="nurse-vitals"
      career="Registered Nurse"
      kicker="Vitals trend"
      name="Bed 4A-2 · 6-hour panel"
      stamp="Monitoring · 2-hour interval"
    >
      <div className="wa-sparkline">
        <div className="wa-sparkline__top">
          <p className="wa-sparkline__label">Heart rate · bpm</p>
          <p className="wa-sparkline__value">68–96 · latest 74</p>
        </div>
        <svg
          viewBox="0 0 320 64"
          role="img"
          aria-label="Heart rate trend from 06:00 to 12:00, mostly between 68 and 96 beats per minute, settling to 74 at noon"
        >
          <path
            className="wa-svg-trend-area"
            d="M0 26 L64 18 L128 30 L192 24 L256 38 L320 46 L320 64 L0 64 Z"
          />
          <path
            className="wa-svg-trend"
            d="M0 26 L64 18 L128 30 L192 24 L256 38 L320 46"
          />
          <circle className="wa-svg-node wa-svg-node--live" cx="320" cy="46" r="4" />
        </svg>
      </div>
      <div className="wa-scroll">
        <table className="wa-table">
          <caption className="visually-hidden">
            Recorded vital signs every two hours
          </caption>
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">HR</th>
              <th scope="col">BP</th>
              <th scope="col">SpO₂</th>
              <th scope="col">RR</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="wa-key">06:00</td>
              <td className="wa-num">88</td>
              <td className="wa-num">118/72</td>
              <td className="wa-num">97%</td>
              <td className="wa-num">16</td>
            </tr>
            <tr>
              <td className="wa-key">08:00</td>
              <td className="wa-num">96</td>
              <td className="wa-num">124/76</td>
              <td className="wa-num">96%</td>
              <td className="wa-num">18</td>
            </tr>
            <tr>
              <td className="wa-key">10:00</td>
              <td className="wa-num">81</td>
              <td className="wa-num">116/70</td>
              <td className="wa-num">98%</td>
              <td className="wa-num">16</td>
            </tr>
            <tr>
              <td className="wa-key">12:00</td>
              <td className="wa-num">74</td>
              <td className="wa-num">112/68</td>
              <td className="wa-num">98%</td>
              <td className="wa-num">16</td>
            </tr>
          </tbody>
        </table>
      </div>
    </WorkshopSheet>
  );
}

/** Medication administration excerpt with schedule windows. */
export function NurseMedicationTiming() {
  return (
    <WorkshopSheet
      id="nurse-meds"
      career="Registered Nurse"
      kicker="Medication timing"
      name="4 West · scheduled doses"
      stamp="MAR excerpt · window ±15 min"
    >
      <p className="wa-lede">
        Administration times stay inside the ±15 minute window.
      </p>
      <div className="wa-scroll">
        <table className="wa-table">
          <caption className="visually-hidden">
            Scheduled medication administration times
          </caption>
          <thead>
            <tr>
              <th scope="col">Medication</th>
              <th scope="col">Ordered</th>
              <th scope="col">Given</th>
              <th scope="col">State</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="wa-key">Cefazolin 1 g IV</td>
              <td>06:00</td>
              <td>06:04</td>
              <td>
                <span className="wa-chip wa-chip--ok">Given</span>
              </td>
            </tr>
            <tr>
              <td className="wa-key">Enoxaparin 40 mg SC</td>
              <td>08:00</td>
              <td>08:09</td>
              <td>
                <span className="wa-chip wa-chip--ok">Given</span>
              </td>
            </tr>
            <tr>
              <td className="wa-key">Acetaminophen 650 mg PO</td>
              <td>10:00</td>
              <td>—</td>
              <td>
                <span className="wa-chip wa-chip--info">Due</span>
              </td>
            </tr>
            <tr>
              <td className="wa-key">Metoprolol 25 mg PO</td>
              <td>12:00</td>
              <td>—</td>
              <td>
                <span className="wa-chip wa-chip--mute">Pending</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </WorkshopSheet>
  );
}

/** Time-ranked handoff priorities for the incoming shift. */
export function NursePriorityNote() {
  return (
    <WorkshopSheet
      id="nurse-priority"
      career="Registered Nurse"
      kicker="Priority note"
      name="Handoff priorities · next 4 hours"
      stamp="Charge review · 07:10"
    >
      <p className="wa-lede">Ranked by time, not room number.</p>
      <ol className="wa-ordered">
        <li>
          <span className="wa-when">07:30</span>
          <span className="wa-what">
            <strong>Recheck glucose</strong> before breakfast trays clear.
          </span>
        </li>
        <li>
          <span className="wa-when">09:45</span>
          <span className="wa-what">
            <strong>Pull culture labs</strong>; flag any growth to the provider.
          </span>
        </li>
        <li>
          <span className="wa-when">11:30</span>
          <span className="wa-what">
            <strong>Mobility round</strong> with physical therapy, bed 4A-2.
          </span>
        </li>
      </ol>
    </WorkshopSheet>
  );
}
