import {
  Bloom,
  EffectComposer,
  Noise,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { HalfFloatType } from "three";

/**
 * Night-shift stack: restrained bloom only on bright fixtures/screens, a light
 * corner vignette, and optional film grain. No DoF / SSAO / motion blur.
 */
export function SceneEffects({ grain }: { grain: boolean }) {
  return (
    <EffectComposer
      enableNormalPass={false}
      frameBufferType={HalfFloatType}
      multisampling={0}
      stencilBuffer={false}
    >
      <Bloom
        intensity={0.16}
        levels={3}
        luminanceSmoothing={0.16}
        luminanceThreshold={1.18}
        mipmapBlur
        radius={0.22}
      />
      <Vignette darkness={0.16} eskil={false} offset={0.55} />
      {grain ? (
        <Noise
          blendFunction={BlendFunction.SOFT_LIGHT}
          opacity={0.02}
          premultiply
        />
      ) : null}
    </EffectComposer>
  );
}
