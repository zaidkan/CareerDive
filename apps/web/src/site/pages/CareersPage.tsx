import { ChapterSeparator, PublicChapter } from "../ArtDirection.js";
import { readyNowCareers } from "../../careers/selectors.js";
import { PlayableNowChapter } from "../careers/PlayableNowChapter.js";
import { TakingShapeShelf } from "../careers/TakingShapeShelf.js";
import "./careers/careers-page.css";

export function CareersPage() {
  const playable = readyNowCareers()[0];
  return (
    <>
      <PublicChapter
        as="header"
        surface="base"
        rhythm="compact"
        width="full"
        className="car-hero"
      >
        <div className="car-hero__inner">
          <p className="ui-type-eyebrow">Career Explorer</p>
          <h1 className="car-hero__title">Explore careers through the work</h1>
          <p className="car-hero__lede">
            One career you can play today, and four more taking shape around
            the work objects they&rsquo;ll run on.
          </p>
        </div>
      </PublicChapter>
      <ChapterSeparator />
      {playable ? <PlayableNowChapter career={playable} /> : null}
      <ChapterSeparator />
      <TakingShapeShelf />
    </>
  );
}
