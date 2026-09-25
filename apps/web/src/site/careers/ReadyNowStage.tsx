import type { PublicCareer } from "../../careers/types.js";
import { CareerCard } from "./CareerCard.js";

export function ReadyNowStage({ careers }: { careers: readonly PublicCareer[] }) {
  return (
    <section className="career-stage" aria-labelledby="ready-now-title">
      <h2 id="ready-now-title">Ready Now</h2>
      <p>Step into a career you can try today.</p>
      <div className="career-ready-grid">
        {careers.map((career) => <CareerCard key={career.id} career={career} featured />)}
      </div>
    </section>
  );
}
