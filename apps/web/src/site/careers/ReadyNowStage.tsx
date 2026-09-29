import type { PublicCareer } from "../../careers/types.js";
import { CareerCard } from "./CareerCard.js";

export function ReadyNowStage({
  careers,
  headingLevel = 2,
}: {
  careers: readonly PublicCareer[];
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <section className="career-stage" aria-labelledby="ready-now-title">
      <Heading id="ready-now-title">Playable now</Heading>
      <p>Step into a career you can try today.</p>
      <div className="career-ready-grid">
        {careers.map((career) => (
          <CareerCard
            key={career.id}
            career={career}
            featured
            headingLevel={headingLevel === 3 ? 4 : 3}
          />
        ))}
      </div>
    </section>
  );
}
