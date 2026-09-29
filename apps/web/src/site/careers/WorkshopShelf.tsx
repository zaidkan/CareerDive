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
      <Heading id="workshop-title">Taking shape</Heading>
      <p>
        Workshop roles show the kinds of decisions you’d make — previews only,
        for now. Want one of these first? Mark it — you can undo anytime.
      </p>
      <div className="career-request-intro">
        <h3>Which career do you want to try?</h3>
        <p>
          Mark any Workshop role you'd like built next. Change your mind with
          one click — no account, no email.
        </p>
        <p className="career-request-honesty">
          Preview only: requests stay on this page and aren't collected yet.
          When we start collecting, they'll guide what we prioritize — they
          won't guarantee build order.
        </p>
      </div>
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
