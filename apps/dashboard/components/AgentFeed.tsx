'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Bot, User, ChevronLeft, ChevronRight } from 'lucide-react';

export interface ActivityLog {
  id: string;
  timestamp: string;
  agent: string;
  message: string;
}

export function AgentFeed() {
  const params = useParams();
  const engagementId = params?.id as string | undefined;
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isOpen, setIsOpen] = useState(!!engagementId);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-open when entering a specific engagement, keep open if user opened manually
  useEffect(() => {
    if (engagementId) setIsOpen(true);
  }, [engagementId]);

  useEffect(() => {
    if (!engagementId) return;

    let active = true;

    async function poll() {
      while (active) {
        try {
          const res = await fetch(`/api/engagements/${engagementId}/phase`);
          if (res.ok) {
            const data = await res.json();
            setLogs(data.logs ?? []);
          }
        } catch (e) {
          // Network error, keep polling
        }
        await new Promise((r) => setTimeout(r, 5000));
      }
    }

    poll();
    return () => { active = false; };
  }, [engagementId]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div
      className="h-full bg-surface border-l border-border flex flex-col shrink-0 transition-all duration-300 overflow-hidden"
      style={{ width: isOpen ? 320 : 48 }}
    >
      {/* Collapsed strip */}
      {!isOpen && (
        <div className="flex flex-col items-center h-full pt-4 gap-3">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="p-2 rounded-lg hover:bg-white/5 text-muted hover:text-white transition-colors"
            title="Open Agent Activity"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse mt-1" />
        </div>
      )}

      {/* Expanded panel */}
      {isOpen && (
        <>
          <div className="p-4 border-b border-border/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse" />
              <h2 className="font-semibold text-sm whitespace-nowrap">Agent Activity</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted">Live</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-white/5 text-muted hover:text-white transition-colors"
                title="Collapse"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!engagementId ? (
              <p className="text-muted text-sm italic">Select an engagement to view activity.</p>
            ) : logs.length === 0 ? (
              <p className="text-muted text-sm italic">Awaiting agent activity...</p>
            ) : (
              logs.map((log) => (
                <MessageBubble
                  key={log.id}
                  sender={log.agent}
                  text={log.message}
                  isAgent={log.agent !== 'Operator' && log.agent !== 'Human'}
                />
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </>
      )}
    </div>
  );
}

function MessageBubble({ sender, text, isAgent }: { sender: string, text: string, isAgent: boolean }) {
  return (
    <div className={`flex flex-col gap-1 ${isAgent ? 'items-start' : 'items-end'}`}>
      <span className="text-[10px] text-muted/80 uppercase tracking-wide font-medium flex items-center gap-1">
        {isAgent ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
        {sender}
      </span>
      <div className={`p-3 rounded-2xl max-w-[90%] text-sm leading-relaxed ${isAgent ? 'bg-card border border-border/50 rounded-tl-sm text-white/90' : 'bg-primary text-white rounded-tr-sm shadow-md shadow-primary/20'}`}>
        {text}
      </div>
    </div>
  );
}
