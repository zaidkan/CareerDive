import { apiPost } from "../transport.js";
import { launchEvent } from "../analytics.js";
import { z } from "zod";
import { useEffect, useRef, useState } from "react";
import { compatibilityDetails, type RecoveryContext } from "./diagnostics.js";
const KEY = "career-expo-support-draft";
const empty = {
  category: "Workplace",
  description: "",
  contact: "",
  technical: false,
};
let memoryDraft = empty;
function readDraft() {
  try {
    const saved: unknown = JSON.parse(
      window.sessionStorage.getItem(KEY) ?? "{}",
    );
    if (!saved || typeof saved !== "object") return empty;
    const data = saved as Record<string, unknown>;
    return {
      category:
        typeof data.category === "string" &&
        ["Starting a shift", "Workplace", "Accessibility", "Other"].includes(
          data.category,
        )
          ? data.category
          : empty.category,
      description:
        typeof data.description === "string"
          ? data.description.slice(0, 5000)
          : "",
      contact:
        typeof data.contact === "string" ? data.contact.slice(0, 254) : "",
      technical: data.technical === true,
    };
  } catch {
    return memoryDraft;
  }
}
export function ProblemReport({ context }: { context: RecoveryContext }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(readDraft);
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);
  const requestRef = useRef<{ payload: string; id: string } | undefined>(
    undefined,
  );
  const trigger = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLSelectElement>(null);
  const copyText = useRef<HTMLTextAreaElement>(null);
  const [manualCopy, setManualCopy] = useState("");
  useEffect(() => {
    if (open) field.current?.focus();
  }, [open]);
  useEffect(() => {
    memoryDraft = draft;
    try {
      window.sessionStorage.setItem(KEY, JSON.stringify(draft));
    } catch {
      /* Memory retains draft if storage is blocked. */
    }
  }, [draft]);
  function report() {
    return {
      category: draft.category,
      description: draft.description,
      contact: draft.contact,
      ...(draft.technical
        ? { technicalDetails: compatibilityDetails(context) }
        : {}),
    };
  }
  async function submit(event: React.SyntheticEvent) {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setStatus("Sending your report…");
    try {
      const payload = report();
      const serialized = JSON.stringify(payload);
      try {
        const saved: unknown = JSON.parse(
          window.sessionStorage.getItem(`${KEY}-request`) ?? "null",
        );
        if (
          saved &&
          typeof saved === "object" &&
          "payload" in saved &&
          "id" in saved &&
          saved.payload === serialized &&
          typeof saved.id === "string"
        )
          requestRef.current = { payload: serialized, id: saved.id };
      } catch {
        /* Retain the same request in memory when tab storage is blocked. */
      }
      if (requestRef.current?.payload !== serialized)
        requestRef.current = { payload: serialized, id: crypto.randomUUID() };
      try {
        window.sessionStorage.setItem(
          `${KEY}-request`,
          JSON.stringify(requestRef.current),
        );
      } catch {
        /* Memory retains retry identity. */
      }
      const confirmed = z
        .object({ saved: z.literal(true), reportId: z.string().uuid() })
        .parse(
          await apiPost("/api/support-reports", {
            ...payload,
            createRequestId: requestRef.current.id,
          }),
        );
      launchEvent("feedback_report", undefined, confirmed.reportId);
      setStatus("Report sent. Your text stays here for this tab session.");
    } catch {
      setStatus(
        "We couldn't confirm delivery. Your text is saved in this tab. Copy report details, or try sending later.",
      );
    } finally {
      setSending(false);
    }
  }
  async function copy() {
    const text = JSON.stringify(report(), null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Report details copied.");
    } catch {
      setManualCopy(text);
      setStatus("Select and copy the report below.");
    }
  }
  useEffect(() => {
    if (manualCopy) {
      copyText.current?.focus();
      copyText.current?.select();
    }
  }, [manualCopy]);
  return (
    <section className="problem-report" aria-label="Problem report">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen(true);
        }}
      >
        Report a problem
      </button>
      {open && (
        <form onSubmit={(event) => void submit(event)}>
          <h2>Report a problem</h2>
          <p>
            No manual signup needed. Sending uses your anonymous browser identity.
            Draft stays in this tab session. Include only
            what you want to share.
          </p>
          <label>
            Category
            <select
              ref={field}
              value={draft.category}
              onChange={(e) => {
                setDraft({ ...draft, category: e.target.value });
              }}
            >
              {["Starting a shift", "Workplace", "Accessibility", "Other"].map(
                (c) => (
                  <option key={c}>{c}</option>
                ),
              )}
            </select>
          </label>
          <label>
            Description
            <textarea
              required
              maxLength={5000}
              value={draft.description}
              onChange={(e) => {
                setDraft({ ...draft, description: e.target.value });
              }}
            />
          </label>
          <label>
            Contact (optional)
            <input
              maxLength={254}
              value={draft.contact}
              onChange={(e) => {
                setDraft({ ...draft, contact: e.target.value });
              }}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={draft.technical}
              onChange={(e) => {
                setDraft({ ...draft, technical: e.target.checked });
              }}
            />{" "}
            Include technical details
          </label>
          <p>
            Technical details include browser version, graphics availability,
            screen size, motion preference, build, page, and recovery status. No
            session identifier or tracking data.
          </p>
          <div className="recovery-actions">
            <button disabled={sending} type="submit">
              {sending ? "Sending…" : "Send report"}
            </button>
            <button type="button" onClick={() => void copy()}>
              Copy report details
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
              }}
            >
              Close report
            </button>
          </div>
          <p role="status">{status}</p>
          {manualCopy && (
            <label>
              Report details
              <textarea ref={copyText} readOnly value={manualCopy} />
            </label>
          )}
        </form>
      )}
    </section>
  );
}
