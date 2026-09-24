/**
 * States A–B of the workstation wake: a brief display wake into a managed
 * device initialization. Purely decorative atmosphere — never fake logs,
 * never a loading obstacle. Input passes straight through to the sign-in
 * surface beneath, and reduced-motion users never see it at all.
 */
export function WorkstationBoot({ closing }: { closing: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`login-boot${closing ? " login-boot-closing" : ""}`}
      data-testid="login-boot"
    >
      <div className="login-boot-center">
        <span className="login-mark">V</span>
        <p className="login-boot-title">Verdaly</p>
        <p className="login-boot-status">Initializing workspace</p>
        <p className="login-boot-meta">Managed device · Secure workstation</p>
        <span className="login-boot-bar" />
      </div>
    </div>
  );
}
