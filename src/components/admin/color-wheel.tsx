import { useEffect, useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";

type Props = {
  value: string;
  onChange: (v: string) => void;
  label?: string;
};

export function ColorWheel({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Pick color"
          className="h-10 w-10 cursor-pointer rounded-full border-2 border-border shadow-sm"
          style={{ background: value }}
        />
        <input
          className="input flex-1 font-mono text-xs"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {open && (
        <div className="absolute left-0 top-12 z-50 rounded-xl border border-border bg-background p-3 shadow-lg">
          <HexColorPicker color={value} onChange={onChange} />
        </div>
      )}
    </div>
  );
}
