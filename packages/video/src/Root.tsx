import { Composition } from "remotion";
import { FPS } from "./theme";
import { HeroSting } from "./compositions/HeroSting";
import { AmbientGlow } from "./compositions/AmbientGlow";

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="HeroSting"
        component={HeroSting}
        durationInFrames={FPS * 5}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="AmbientGlow"
        component={AmbientGlow}
        durationInFrames={FPS * 12}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
}
