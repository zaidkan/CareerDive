import {
  careerRequestState,
  setCareerRequested,
} from "../../careerRequests.js";
import { useEffect, useState } from "react";

export type SetCareerRequest = (desired: {
  careerId: string;
  requested: boolean;
}) => Promise<void> | void;

/** Success reflects server-confirmed state; hydration restores after reload. */
export function CareerRequestToggle({
  careerId,
  careerTitle,
  setCareerRequest,
}: {
  careerId: string;
  careerTitle: string;
  setCareerRequest?: SetCareerRequest | undefined;
}) {
  const [requested, setRequested] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(Boolean(setCareerRequest));
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (setCareerRequest) return;
    let active = true;
    void careerRequestState()
      .then((ids) => {
        if (active) {
          setRequested(ids.includes(careerId));
          setLoaded(true);
          setError(false);
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [careerId, setCareerRequest, reload]);

  async function update() {
    const desired = !requested;
    setRequested(desired);
    setError(false);

    setPending(true);
    try {
      await (setCareerRequest ?? setCareerRequested)({
        careerId,
        requested: desired,
      });
    } catch {
      setRequested(!desired);
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="career-request">
      <button
        type="button"
        className="button-secondary"
        aria-label={`Request ${careerTitle}`}
        aria-pressed={requested}
        disabled={pending || !loaded}
        onClick={() => {
          void update();
        }}
      >
        {pending
          ? "Saving request…"
          : requested
            ? "Requested ✓ · click to undo"
            : "Request this career"}
      </button>
      {error ? (
        <p className="career-request-note" role="alert">
          Request unavailable. Your choice has not been confirmed.
          {!loaded ? (
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                setReload((value) => value + 1);
              }}
            >
              Retry connection
            </button>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
