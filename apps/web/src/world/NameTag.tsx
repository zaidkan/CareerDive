import { Html } from "@react-three/drei";

/** Compact floating label — keeps Chrome from ballooning HTML over figures. */
export function NameTag({
  name,
  role,
  position = [0, 2.25, 0],
  star = false,
  visible = true,
}: {
  name: string;
  role?: string;
  position?: [number, number, number];
  star?: boolean;
  visible?: boolean;
}) {
  if (!visible) return null;
  return (
    <Html
      center
      distanceFactor={14}
      position={position}
      style={{ pointerEvents: "none", userSelect: "none" }}
      zIndexRange={[12, 0]}
    >
      <div className={`name-tag${star ? " name-tag-star" : ""}`}>
        <strong>
          {star ? "★ " : ""}
          {name}
        </strong>
        {role ? <span>{role}</span> : null}
      </div>
    </Html>
  );
}
