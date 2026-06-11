'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ExpandableContentProps {
  children: React.ReactNode;
  maxHeight?: number;
}

export function ExpandableContent({ children, maxHeight = 120 }: ExpandableContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      setIsOverflowing(contentRef.current.scrollHeight > maxHeight);
    }
  }, [children, maxHeight]);

  return (
    <div className="relative">
      <div
        ref={contentRef}
        className={`overflow-hidden transition-all duration-300 relative`}
        style={{ maxHeight: isExpanded ? `${contentRef.current?.scrollHeight}px` : `${maxHeight}px` }}
      >
        {children}
        
        {!isExpanded && isOverflowing && (
          <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-[#1A1A1C] to-transparent pointer-events-none" />
        )}
      </div>

      {isOverflowing && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-green-500 hover:text-green-500/80 transition-colors"
        >
          {isExpanded ? (
            <>Read less <ChevronUp className="w-3 h-3" /></>
          ) : (
            <>Read more <ChevronDown className="w-3 h-3" /></>
          )}
        </button>
      )}
    </div>
  );
}
