import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function ensureInit() {
  if (process.env.NODE_ENV === 'development') {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8089';
  }
  if (getApps().length === 0) {
    initializeApp({ projectId: process.env.GOOGLE_CLOUD_PROJECT });
    getFirestore().settings({ ignoreUndefinedProperties: true });
  }
}

// GET /api/engagements/[id]/deliverables
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    ensureInit();
    const doc = await getFirestore().collection('engagements').doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ qa: null, launchPack: null });
    }

    const data = doc.data() || {};
    return NextResponse.json({
      qa: data._qaReport ?? null,
      launchPack: data._accountReport ?? null,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    console.error('[API /deliverables] Error:', message);
    return NextResponse.json({ qa: null, launchPack: null, error: message }, { status: 500 });
  }
}
