import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export default function Collapse({
  title,
  defaultOpen = false,
  children,
  className = "",
  hideToggle = false,
}: {
  title: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  hideToggle?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen || hideToggle);
  const ref = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState("0px");

  useEffect(() => {
    if (!ref.current) return;
    setHeight(open ? `${ref.current.scrollHeight}px` : "0px");
  }, [open, children]);

  return (
    <div className={`overflow-hidden ${className}`}>
      {hideToggle ? (
        <div className="w-full flex items-center justify-between py-2">
          <div className="text-sm font-semibold text-slate-800">{title}</div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((s) => !s)}
          aria-expanded="true"
          aria-controls="collapse-content"
          className="w-full flex items-center justify-between py-2"
        >
          <div className="text-sm font-semibold text-slate-800">{title}</div>
          <ChevronDown
            className={`w-5 h-5 text-slate-600 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      )}

      <div
        id="collapse-content"
        className="transition-[height] duration-240 ease-in-out overflow-hidden"
        style={{ height }}
        aria-hidden="false"
      >
        <div ref={ref} className="pt-2 pb-4">
          {children}
        </div>
      </div>
    </div>
  );
}
