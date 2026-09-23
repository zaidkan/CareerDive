import { Composition } from "remotion";
import { FPS } from "./theme";
import { HeroSting } from "./compositions/HeroSting";

export function RemotionRoot() {
  return (
    <Composition
      id="HeroSting"
      component={HeroSting}
      durationInFrames={FPS * 5}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
}
