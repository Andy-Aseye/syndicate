'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useCreateEngagement } from '@/hooks/useCreateEngagement';

const MAX_AUDIO_BYTES = 20 * 1024 * 1024; // ~20MB

export default function NewEngagementForm() {
  const { createEngagement, isPending } = useCreateEngagement();
  const [transcript, setTranscript] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [intakeError, setIntakeError] = useState<string | null>(null);
  const textFileRef = useRef<HTMLInputElement>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);

  async function handleTextFile(file: File) {
    setIntakeError(null);
    try {
      const text = await file.text();
      setTranscript(text);
    } catch {
      setIntakeError('Could not read that file. Please paste the transcript instead.');
    }
  }

  async function handleAudioFile(file: File) {
    setIntakeError(null);
    if (file.size > MAX_AUDIO_BYTES) {
      setIntakeError('Audio file is too large (max ~20MB). Try a shorter clip or paste the transcript.');
      return;
    }
    setTranscribing(true);
    try {
      const fd = new FormData();
      fd.append('audio', file);
      const res = await fetch('/api/intake/transcribe', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.transcript) {
        setIntakeError(data.error || 'Transcription failed. Please paste the transcript instead.');
        return;
      }
      setTranscript(data.transcript);
    } catch {
      setIntakeError('Transcription failed. Please paste the transcript instead.');
    } finally {
      setTranscribing(false);
    }
  }

  const inputClass =
    'w-full px-3 py-2.5 rounded-lg bg-[#111113] border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:border-primary/60 outline-none transition-colors';
  const labelClass = 'block text-xs text-zinc-400 font-medium mb-1.5';
  const chipClass =
    'inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-white/10 bg-white/5 text-xs text-zinc-400 hover:text-white hover:border-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <form action={createEngagement} className="space-y-4">
      <div>
        <label className={labelClass}>
          Client name <span className="text-zinc-600">*</span>
        </label>
        <input
          name="clientName"
          required
          className={inputClass}
          placeholder="Acme Coffee Co."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Email</label>
          <input
            name="clientEmail"
            type="email"
            className={inputClass}
            placeholder="founder@acme.coffee"
          />
        </div>
        <div>
          <label className={labelClass}>Company</label>
          <input
            name="clientCompany"
            className={inputClass}
            placeholder="Acme Coffee Co."
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Initial brief</label>
        <textarea
          name="brief"
          rows={5}
          className={`${inputClass} resize-none`}
          placeholder="What does the client want? A one-paragraph summary is enough — Discovery will research the business and extract structured requirements."
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-zinc-400 font-medium">
            Transcript <span className="text-zinc-600">(optional)</span>
          </label>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => textFileRef.current?.click()}
              className={chipClass}
            >
              ↑ .txt/.md
            </button>
            <button
              type="button"
              disabled={transcribing}
              onClick={() => audioFileRef.current?.click()}
              className={chipClass}
            >
              {transcribing ? 'Transcribing…' : '↑ Audio'}
            </button>
          </div>
        </div>

        <input
          ref={textFileRef}
          type="file"
          accept=".txt,.md,text/plain,text/markdown"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleTextFile(file);
            e.target.value = '';
          }}
        />
        <input
          ref={audioFileRef}
          type="file"
          accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleAudioFile(file);
            e.target.value = '';
          }}
        />

        <textarea
          name="transcript"
          rows={4}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          disabled={transcribing}
          className={`${inputClass} resize-none disabled:opacity-60`}
          placeholder="Paste the discovery call transcript here, or upload a .txt/.md file or an audio recording (mp3/m4a/wav, ~20MB max)."
        />

        {transcribing && (
          <p className="mt-1.5 text-[11px] text-cyan">
            Transcribing with Gemini — this can take up to a minute for longer recordings…
          </p>
        )}
        {intakeError && (
          <p className="mt-1.5 text-[11px] text-red-400">{intakeError}</p>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending || transcribing}
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {isPending ? 'Starting…' : 'Start engagement →'}
        </button>
        <Link
          href="/engagements"
          className="px-4 py-2 rounded-lg border border-white/10 text-sm text-zinc-400 hover:text-white hover:border-white/20 transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
