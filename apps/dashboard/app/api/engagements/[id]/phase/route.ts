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

// GET /api/engagements/[id]/phase
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    ensureInit();
    const db = getFirestore();
    const doc = await db.collection('engagements').doc(id).get();

    const snapshot = await db.collection('engagements')
      .doc(id)
      .collection('logs')
      .orderBy('timestamp', 'asc')
      .get();

    const logs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (!doc.exists) {
      return NextResponse.json({ phase: 'intake', logs });
    }

    const data = doc.data() || {};
    return NextResponse.json({ 
      phase: data.phase || 'intake', 
      logs,
      lovableBuildUrl: data.lovableBuildUrl,
      deployedUrl: data.deployedUrl
    });
  } catch (e: any) {
    console.error('[API /phase] Error:', e.message);
    return NextResponse.json({ phase: 'intake', logs: [], error: e.message }, { status: 500 });
  }
}
