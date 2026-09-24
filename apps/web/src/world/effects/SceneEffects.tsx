import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { HalfFloatType } from "three";

/**
 * Night-shift stack: bloom only the bright emissive fixtures/screens plus a
 * light corner vignette. No DoF / SSAO / motion blur / grain — a full-screen
 * Noise pass costs fill rate for an effect nobody consciously sees, and the
 * vignette alone is one cheap pass.
 *
 * `grain` is accepted so call sites stay stable if film grain returns.
 */
export function SceneEffects({ grain: _grain }: { grain: boolean }) {
  void _grain;
  return (
    <EffectComposer
      enableNormalPass={false}
      frameBufferType={HalfFloatType}
      multisampling={0}
      stencilBuffer={false}
    >
      <Bloom
        intensity={0.32}
        levels={3}
        luminanceSmoothing={0.22}
        luminanceThreshold={0.9}
        mipmapBlur
        radius={0.32}
      />
      <Vignette darkness={0.38} eskil={false} offset={0.42} />
    </EffectComposer>
  );
}
