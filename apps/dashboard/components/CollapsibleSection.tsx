'use client';

import { useState, type ReactNode } from 'react';

interface Props {
  title: string;
  titleRight?: ReactNode;
  titleSuffix?: ReactNode;
  className?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CollapsibleSection({
  title,
  titleRight,
  titleSuffix,
  className = '',
  defaultOpen = false,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between group"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-bold text-gold uppercase tracking-wider whitespace-nowrap">
            {title}
          </span>
          {titleSuffix}
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          {titleRight}
          <span
            className="text-white/40 group-hover:text-white/70 transition-colors select-none"
            style={{ fontSize: 18, lineHeight: 1, fontWeight: 300 }}
          >
            {open ? '−' : '+'}
          </span>
        </div>
      </button>

      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 300ms ease',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div className="pt-3">{children}</div>
        </div>
      </div>
    </div>
  );
}
