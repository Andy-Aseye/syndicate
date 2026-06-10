'use client';

import { useEffect, useState } from 'react';

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
    <div className="rounded border border-white/10 bg-card p-4">
      <p className="text-xs font-bold text-gold/60 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-white/90">{value}</p>
    </div>
  );
}

function ListField({ label, items }: { label: string; items?: string[] | null }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="rounded border border-white/10 bg-card p-4">
      <p className="text-xs font-bold text-gold/60 uppercase tracking-wider mb-2">{label}</p>
      <ul className="space-y-1 text-sm text-white/90">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
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
    <section className="mb-10">
      <h2 className="text-sm font-bold text-gold uppercase tracking-wider mb-3">
        Requirements <span className="text-muted normal-case font-normal">· extracted by Discovery</span>
      </h2>

      {requirements.one_liner && (
        <div className="rounded border border-cyan/30 bg-cyan/5 p-4 mb-3">
          <p className="text-xs font-bold text-cyan/70 uppercase tracking-wider mb-1">One-liner</p>
          <p className="text-sm text-white/90">{requirements.one_liner}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
    </section>
  );
}
