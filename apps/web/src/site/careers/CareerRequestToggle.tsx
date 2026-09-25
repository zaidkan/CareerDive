import { useState } from "react";

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
      <button
        type="button"
        className="button-secondary"
        aria-pressed={requested}
        disabled={pending}
        onClick={() => {
          void update();
        }}
      >
        Request {careerTitle}
        <span aria-hidden="true">{requested ? " · requested" : ""}</span>
      </button>
      {error ? (
        <p className="career-request-note" role="alert">
          Request change failed. Try again.
        </p>
      ) : null}
      <p className="career-request-note">
        {setCareerRequest
          ? "You can change your request."
          : "Preview only. Your choice stays on this page; requests are not collected yet."}
      </p>
    </div>
  );
}
