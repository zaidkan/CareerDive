import { useEffect, useRef } from "react";

export function OsCursor({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    const root = ref.current?.closest(".desk-os") as HTMLElement | null;
    if (!root) return;
    const onMove = (event: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const rect = root.getBoundingClientRect();
      el.style.transform = `translate(${String(event.clientX - rect.left)}px, ${String(event.clientY - rect.top)}px)`;
      el.style.opacity = "1";
    };
    const onLeave = () => {
      if (ref.current) ref.current.style.opacity = "0";
    };
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    return () => {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, [active]);

  if (!active) return null;
  return <div aria-hidden="true" className="desk-os-cursor" ref={ref} />;
}
