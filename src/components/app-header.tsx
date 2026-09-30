import { VantaBirdsBg } from "./vanta-birds-bg";

export function AppHeader({ title, greeting }: { title?: string; greeting?: boolean }) {
  return (
    <header className="sticky top-3 z-40 mx-3 mt-3 min-h-[116px] overflow-hidden rounded-2xl border border-white/20 bg-secondary shadow-soft">
      <VantaBirdsBg className="pointer-events-none absolute inset-0" />
      <div className="relative flex min-h-[116px] items-center px-6 py-5">
        {greeting ? (
          <div className="w-full text-center">
            <h1
              className="text-[34px] leading-none tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
              style={{ fontFamily: '"Qurovademo Light", "Inter", sans-serif', fontWeight: 300 }}
            >
              StudyMart
            </h1>
            <p
              className="mt-2 text-[12.5px] leading-relaxed text-white/85 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]"
              style={{ fontFamily: '"Google Sans Flex", "Inter", sans-serif' }}
            >
              Digital products for curious minds.
            </p>
          </div>
        ) : (
          <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
            {title}
          </h1>
        )}
      </div>
    </header>
  );
}
