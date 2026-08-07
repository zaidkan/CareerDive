import { Html } from "@react-three/drei";

export function NameTag({
  name,
  role,
  position = [0, 2.05, 0],
  star = false,
}: {
  name: string;
  role: string;
  position?: [number, number, number];
  star?: boolean;
}) {
  return (
    <Html
      center
      distanceFactor={9}
      position={position}
      style={{ pointerEvents: "none", userSelect: "none" }}
      zIndexRange={[20, 0]}
    >
      <div className={`name-tag${star ? " name-tag-star" : ""}`}>
        <strong>
          {star ? "★ " : ""}
          {name}
        </strong>
        <span>{role}</span>
      </div>
    </Html>
  );
}
