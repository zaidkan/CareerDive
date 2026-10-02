import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";

export type SetCareerRequest = (desired: {
  careerId: string;
  requested: boolean;
}) => Promise<void> | void;

/** Local interaction only until a consented persistence endpoint exists. */
export function CareerRequestToggle({
  careerId,
  careerTitle,
  setCareerRequest,
}: {
  careerId: string;
  careerTitle: string;
  setCareerRequest?: SetCareerRequest | undefined;
}) {
  const reduced = useReducedMotion();
  const [requested, setRequested] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function update() {
    const desired = !requested;
    setRequested(desired);
    setError(false);
    if (!setCareerRequest) return;
    setPending(true);
    try {
      await setCareerRequest({ careerId, requested: desired });
    } catch {
      setRequested(!desired);
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="career-request">
      <motion.button
        whileTap={reduced || pending ? {} : { scale: 0.98 }}
        transition={{ duration: 0.16 }}
        type="button"
        className="button-secondary"
        aria-label={`Request ${careerTitle}`}
        aria-pressed={requested}
        disabled={pending}
        onClick={() => {
          void update();
        }}
      >
        <motion.span
          key={`${String(requested)}-${String(error)}`}
          initial={reduced ? false : { opacity: 0.6, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.24 }}
          style={{ display: "inline-block" }}
        >
          {requested ? "Requested ✓ · click to undo" : `Request ${careerTitle}`}
        </motion.span>
      </motion.button>
      {error ? (
        <p className="career-request-note" role="alert">
          Request change failed. Try again.
        </p>
      ) : null}
    </div>
  );
}
