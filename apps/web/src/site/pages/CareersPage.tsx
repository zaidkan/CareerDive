import { CareerExplorer } from "../careers/CareerExplorer.js";

export function CareersPage() {
  return (
    <>
      <header className="page-section page-hero">
        <p className="eyebrow">Career Explorer</p>
        <h1>Explore careers through the work</h1>
        <p className="lede">Playable careers are marked Ready Now. Explore other roles through practical previews while they are in the workshop.</p>
      </header>
      <CareerExplorer />
    </>
  );
}
