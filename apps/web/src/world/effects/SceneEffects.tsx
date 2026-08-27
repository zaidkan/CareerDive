import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { HalfFloatType } from "three";

/**
 * Night-shift stack: bloom only the bright emissive fixtures/screens, a light
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
        intensity={0.32}
        levels={4}
        luminanceSmoothing={0.22}
        luminanceThreshold={0.9}
        mipmapBlur
        radius={0.32}
      />
      <Vignette darkness={0.38} eskil={false} offset={0.42} />
      {grain ? (
        <Noise
          blendFunction={BlendFunction.SOFT_LIGHT}
          opacity={0.035}
          premultiply
        />
      ) : null}
    </EffectComposer>
  );
}
