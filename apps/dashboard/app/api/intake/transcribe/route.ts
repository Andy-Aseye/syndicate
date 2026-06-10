import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';
// Transcription of a ~20MB recording can take a while.
export const maxDuration = 120;

const MAX_AUDIO_BYTES = 20 * 1024 * 1024; // ~20MB

const ALLOWED_MIMES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
]);

const EXTENSION_MIME: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/x-m4a',
  wav: 'audio/wav',
};

// POST /api/intake/transcribe — multipart { audio: File } → { transcript }
// Proxies the raw audio bytes to the Discovery agent's /transcribe endpoint,
// which holds the google-genai (Vertex) credentials.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let file: File;
  try {
    const formData = await req.formData();
    const candidate = formData.get('audio');
    if (!(candidate instanceof File)) {
      return NextResponse.json({ error: 'Missing "audio" file field.' }, { status: 400 });
    }
    file = candidate;
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data.' }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: 'Audio file is empty.' }, { status: 400 });
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: 'Audio file too large (max ~20MB).' }, { status: 413 });
  }

  // Browsers sometimes report an empty mime for .m4a — fall back to extension.
  let mime = (file.type || '').toLowerCase();
  if (!ALLOWED_MIMES.has(mime)) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    mime = EXTENSION_MIME[ext] ?? '';
  }
  if (!mime) {
    return NextResponse.json(
      { error: 'Unsupported audio type. Use mp3, m4a, or wav.' },
      { status: 415 }
    );
  }

  const discoveryUrl =
    process.env.ATLAS_DISCOVERY_URL ??
    process.env.AGENT_URL_DISCOVERY ??
    'http://localhost:8081';

  try {
    const body = Buffer.from(await file.arrayBuffer());
    const res = await fetch(`${discoveryUrl}/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': mime },
      body,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.transcript) {
      const message =
        typeof data.error === 'string'
          ? data.error
          : 'Transcription failed. Try again or paste the transcript.';
      return NextResponse.json({ error: message }, { status: res.ok ? 502 : res.status });
    }
    return NextResponse.json({ transcript: data.transcript });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    console.error('[API /intake/transcribe] Error:', message);
    return NextResponse.json(
      { error: 'Transcription service unreachable. Try again or paste the transcript.' },
      { status: 502 }
    );
  }
}
