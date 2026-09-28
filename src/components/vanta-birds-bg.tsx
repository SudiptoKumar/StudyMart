import { useEffect, useRef, useState } from "react";

type VantaInstance = { destroy: () => void };

export function VantaBirdsBg({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const effectRef = useRef<VantaInstance | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !ref.current || effectRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const THREE = await import("three");
        const mod = await import("vanta/dist/vanta.clouds.min");
        const CLOUDS = (mod as { default: (opts: Record<string, unknown>) => VantaInstance }).default;
        if (cancelled || !ref.current) return;
        const bounds = ref.current.getBoundingClientRect();
        const headerHeight = Math.max(96, Math.round(bounds.height || 116));

        effectRef.current = CLOUDS({
          el: ref.current,
          THREE,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: headerHeight,
          minWidth: Math.max(240, Math.round(bounds.width || 360)),
          backgroundColor: 0x68b8d7,
          skyColor: 0x68b8d7,
          cloudColor: 0xffffff,
          cloudShadowColor: 0x8aa6b8,
          sunColor: 0xffd27d,
          sunGlareColor: 0xfff0b3,
          sunlightColor: 0xffdca8,
          speed: 1.35,
        });
      } catch (err) {
        console.warn("Vanta clouds failed to init", err);
      }
    })();

    return () => {
      cancelled = true;
      if (effectRef.current) {
        try {
          effectRef.current.destroy();
        } catch {
          /* noop */
        }
        effectRef.current = null;
      }
    };
  }, [mounted]);

  return <div ref={ref} aria-hidden className={className} />;
}
