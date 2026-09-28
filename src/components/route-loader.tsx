import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export function RouteLoader() {
  const isNavigating = useRouterState({
    select: (s) => s.isLoading || s.isTransitioning,
  });

  const [progress, setProgress] = useState(0);
  const [barVisible, setBarVisible] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const rafRef = useRef<number | null>(null);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isNavigating) {
      // start
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      setBarVisible(true);
      setProgress(0);

      // Animate to ~90%
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        // Ease-out toward 90 over ~1.2s
        const next = Math.min(90, 90 * (1 - Math.exp(-elapsed / 400)));
        setProgress(next);
        if (next < 89.5) {
          rafRef.current = requestAnimationFrame(tick);
        }
      };
      rafRef.current = requestAnimationFrame(tick);

      // Delayed overlay
      overlayTimerRef.current = setTimeout(() => {
        setOverlayVisible(true);
      }, 250);
    } else {
      // finish
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (overlayTimerRef.current) {
        clearTimeout(overlayTimerRef.current);
        overlayTimerRef.current = null;
      }
      setOverlayVisible(false);
      setProgress(100);
      hideTimerRef.current = setTimeout(() => {
        setBarVisible(false);
        setProgress(0);
      }, 300);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    };
  }, [isNavigating]);

  return (
    <>
      {/* Top progress bar */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px]"
        style={{
          opacity: barVisible ? 1 : 0,
          transition: "opacity 300ms ease-out",
        }}
      >
        <div
          className="h-full bg-primary"
          style={{
            width: `${progress}%`,
            transition: progress === 100 ? "width 200ms ease-out" : "width 150ms linear",
            boxShadow: "0 0 10px color-mix(in oklab, var(--brand) 60%, transparent)",
          }}
        />
      </div>

      {/* Center overlay (delayed) */}
      {overlayVisible && (
        <div
          aria-live="polite"
          aria-busy="true"
          className="fixed inset-0 z-[99] flex items-center justify-center bg-background/70 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <DotLottieReact
            src="https://lottie.host/0102a595-61e6-4dc3-8daa-f3b6f9c7df38/pkJ1yHtiz4.lottie"
            loop
            autoplay
            style={{ width: 160, height: 160 }}
          />
        </div>
      )}
    </>
  );
}
