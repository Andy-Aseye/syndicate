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

// GET /api/engagements/[id]/strategy
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    ensureInit();
    const doc = await getFirestore().collection('engagements').doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ strategy: null });
    }

    return NextResponse.json({ strategy: doc.data()?._strategyOutput ?? null });
  } catch (e: any) {
    console.error('[API /strategy] Error:', e.message);
    return NextResponse.json({ strategy: null, error: e.message }, { status: 500 });
  }
}
