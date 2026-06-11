import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
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
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { qa: null, launchPack: null, requirements: null, error: 'unauthenticated' },
        { status: 401 }
      );
    }
    const tenantId = orgId ?? userId;

    ensureInit();
    const doc = await getFirestore().collection('engagements').doc(id).get();

    // Tenant isolation: respond as "not found" for other tenants' engagements.
    if (!doc.exists || doc.data()?.tenantId !== tenantId) {
      return NextResponse.json(
        { qa: null, launchPack: null, requirements: null },
        { status: 404 }
      );
    }

    const data = doc.data() || {};
    return NextResponse.json({
      qa: data._qaReport ?? null,
      launchPack: data._accountReport ?? null,
      requirements: data._requirements ?? null,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    console.error('[API /deliverables] Error:', message);
    return NextResponse.json(
      { qa: null, launchPack: null, requirements: null, error: message },
      { status: 500 }
    );
  }
}
