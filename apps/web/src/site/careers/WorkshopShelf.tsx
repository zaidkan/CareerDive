import type { PublicCareer } from "../../careers/types.js";
import { CareerCard } from "./CareerCard.js";
import type { SetCareerRequest } from "./CareerRequestToggle.js";

export function WorkshopShelf({
  careers,
  setCareerRequest,
  headingLevel = 2,
}: {
  careers: readonly PublicCareer[];
  setCareerRequest?: SetCareerRequest | undefined;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <section className="career-shelf" aria-labelledby="workshop-title">
      <Heading id="workshop-title">In the Workshop</Heading>
      <p>
        Explore work still being planned. These roles have previews, not
        simulations yet.
      </p>
      <ul className="career-workshop-grid">
        {careers.map((career) => (
          <li key={career.id}>
            <CareerCard
              career={career}
              setCareerRequest={setCareerRequest}
              headingLevel={headingLevel === 3 ? 4 : 3}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
