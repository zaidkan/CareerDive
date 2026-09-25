import type { PublicCareer } from "../../careers/types.js";
import { CareerCard } from "./CareerCard.js";
import type { SetCareerRequest } from "./CareerRequestToggle.js";

export function WorkshopShelf({
  careers,
  setCareerRequest,
}: {
  careers: readonly PublicCareer[];
  setCareerRequest?: SetCareerRequest | undefined;
}) {
  return (
    <section className="career-shelf" aria-labelledby="workshop-title">
      <h2 id="workshop-title">In the Workshop</h2>
      <p>Explore work still being planned. These roles have previews, not simulations yet.</p>
      <ul className="career-workshop-grid">
        {careers.map((career) => (
          <li key={career.id}>
            <CareerCard career={career} setCareerRequest={setCareerRequest} />
          </li>
        ))}
      </ul>
    </section>
  );
}
