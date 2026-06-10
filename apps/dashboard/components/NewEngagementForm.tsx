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

  return (
    <form action={createEngagement} className="space-y-6">
      <div>
        <label className="block text-sm font-bold text-primary uppercase tracking-wider mb-2">
          Client name *
        </label>
        <input
          name="clientName"
          required
          className="w-full px-4 py-3 rounded bg-card border border-white/10 focus:border-primary outline-none"
          placeholder="Acme Coffee Co."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-primary uppercase tracking-wider mb-2">
            Email
          </label>
          <input
            name="clientEmail"
            type="email"
            className="w-full px-4 py-3 rounded bg-card border border-white/10 focus:border-primary outline-none"
            placeholder="founder@acme.coffee"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-primary uppercase tracking-wider mb-2">
            Company
          </label>
          <input
            name="clientCompany"
            className="w-full px-4 py-3 rounded bg-card border border-white/10 focus:border-primary outline-none"
            placeholder="Acme Coffee Co."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-primary uppercase tracking-wider mb-2">
          Initial brief
        </label>
        <textarea
          name="brief"
          rows={8}
          className="w-full px-4 py-3 rounded bg-card border border-white/10 focus:border-primary outline-none resize-none"
          placeholder="What does the client want? A one-paragraph summary is enough — Discovery will research the business and extract structured requirements."
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-bold text-primary uppercase tracking-wider">
            Discovery call transcript <span className="text-muted normal-case font-normal">(optional)</span>
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => textFileRef.current?.click()}
              className="text-xs font-bold uppercase tracking-wider text-cyan hover:text-cyan/80"
            >
              Upload .txt/.md
            </button>
            <button
              type="button"
              disabled={transcribing}
              onClick={() => audioFileRef.current?.click()}
              className="text-xs font-bold uppercase tracking-wider text-cyan hover:text-cyan/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {transcribing ? 'Transcribing audio…' : 'Upload audio'}
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
          rows={8}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          disabled={transcribing}
          className="w-full px-4 py-3 rounded bg-card border border-white/10 focus:border-primary outline-none resize-none disabled:opacity-60"
          placeholder="Paste the discovery call transcript here, or upload a .txt/.md file or an audio recording (mp3/m4a/wav, ~20MB max). Discovery will extract structured requirements from it. Review/edit before submitting."
        />
        {transcribing && (
          <p className="mt-2 text-xs text-cyan">
            Transcribing with Gemini — this can take up to a minute for longer recordings…
          </p>
        )}
        {intakeError && (
          <p className="mt-2 text-xs text-red-400">{intakeError}</p>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isPending || transcribing}
          className="px-6 py-3 rounded bg-primary text-white font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Starting workflow...' : 'Start engagement →'}
        </button>
        <Link
          href="/engagements"
          className="px-6 py-3 rounded border border-white/20 hover:bg-white/5"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
