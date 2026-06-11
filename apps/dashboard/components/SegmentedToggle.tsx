'use client';

import { useState } from 'react';

interface SegmentedToggleProps {
  options: string[];
  defaultSelected?: string;
  onChange?: (value: string) => void;
}

export function SegmentedToggle({ options, defaultSelected, onChange }: SegmentedToggleProps) {
  const [selected, setSelected] = useState(defaultSelected || options[0]);

  return (
    <div className="flex bg-primary/20 p-1 rounded-xl w-fit">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => {
            setSelected(option);
            onChange?.(option);
          }}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex-1 text-center ${
            selected === option
              ? 'bg-primary text-white shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-primary/40'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
