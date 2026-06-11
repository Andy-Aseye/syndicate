'use client';

import { useEffect, useState } from 'react';
import { ExpandableContent } from '@/components/ExpandableContent';
import { CollapsibleSection } from './CollapsibleSection';

interface Requirements {
  one_liner?: string | null;
  target_audience?: string | null;
  products_or_services?: string[] | null;
  brand_voice?: string | null;
  visual_preferences?: string | null;
  budget_hint?: string | null;
  timeline_hint?: string | null;
  must_haves?: string[] | null;
  nice_to_haves?: string[] | null;
  open_questions?: string[] | null;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-card p-3">
      <p className="text-[10px] font-bold text-gold/60 uppercase tracking-wider mb-1">{label}</p>
      <ExpandableContent maxHeight={80}>
        <p className="text-xs text-white/90 leading-relaxed">{value}</p>
      </ExpandableContent>
    </div>
  );
}

function ListField({ label, items }: { label: string; items?: string[] | null }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-card p-3">
      <p className="text-[10px] font-bold text-gold/60 uppercase tracking-wider mb-1.5">{label}</p>
      <ExpandableContent maxHeight={100}>
        <ul className="space-y-1 text-xs text-white/90">
          {items.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </ExpandableContent>
    </div>
  );
}

/**
 * Shows the structured requirements Discovery extracted from the brief /
 * transcript. Polls the deliverables endpoint until requirements appear
 * (same pattern as LaunchDeliverables), then stops. Hidden until then.
 */
export default function RequirementsPanel({ engagementId }: { engagementId: string }) {
  const [requirements, setRequirements] = useState<Requirements | null>(null);

  useEffect(() => {
    let active = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    async function load() {
      try {
        const res = await fetch(`/api/engagements/${engagementId}/deliverables`);
        if (!res.ok || !active) return;
        const data = await res.json();
        if (data.requirements) {
          setRequirements(data.requirements);
          if (interval) clearInterval(interval);
        }
      } catch {
        // keep polling
      }
    }

    load();
    interval = setInterval(load, 5000);
    return () => {
      active = false;
      if (interval) clearInterval(interval);
    };
  }, [engagementId]);

  if (!requirements) return null;

  return (
    <CollapsibleSection
      title="Requirements"
      titleSuffix={
        <span className="text-zinc-500 normal-case font-normal text-[10px]">· extracted by Discovery</span>
      }
      className="mb-8"
    >
      {requirements.one_liner && (
        <div className="rounded-lg border border-cyan/30 bg-cyan/5 p-3 mb-2">
          <p className="text-[10px] font-bold text-cyan/70 uppercase tracking-wider mb-1">One-liner</p>
          <p className="text-xs text-white/90">{requirements.one_liner}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Field label="Target audience" value={requirements.target_audience} />
        <Field label="Brand voice" value={requirements.brand_voice} />
        <Field label="Visual preferences" value={requirements.visual_preferences} />
        <Field label="Budget" value={requirements.budget_hint} />
        <Field label="Timeline" value={requirements.timeline_hint} />
        <ListField label="Products / services" items={requirements.products_or_services} />
        <ListField label="Must-haves" items={requirements.must_haves} />
        <ListField label="Nice-to-haves" items={requirements.nice_to_haves} />
        <ListField label="Open questions" items={requirements.open_questions} />
      </div>
    </CollapsibleSection>
  );
}
