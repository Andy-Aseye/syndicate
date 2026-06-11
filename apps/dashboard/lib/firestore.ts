import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export type EngagementPhase =
  | 'intake'
  | 'strategy'
  | 'design'
  | 'build'
  | 'awaiting_url'
  | 'review'
  | 'launch'
  | 'operate'
  | 'paused'
  | 'archived';

export interface Engagement {
  id: string;
  tenantId: string;
  clientName: string;
  clientEmail?: string;
  clientCompany?: string;
  phase: EngagementPhase;
  brief: string;
  transcript?: string;
  deployedUrl?: string;
  lovableBuildUrl?: string;
  lovableProjectId?: string;
  createdAt: string;
  updatedAt: string;
  /** Set when the Coordinator kickoff call failed; cleared on successful retry. */
  _triggerError?: boolean;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  agent: string;
  message: string;
}

export interface EnrichedActivityLog extends ActivityLog {
  engagementId: string;
  clientName: string;
  clientCompany?: string;
  phase: EngagementPhase;
}

let initialized = false;

function db() {
  if (!initialized && getApps().length === 0) {
    if (process.env.NODE_ENV === 'development') {
      process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8089';
    }
    
    // Cloud Run / GKE: ADC works automatically. Local dev: GOOGLE_APPLICATION_CREDENTIALS.
    initializeApp({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
    });
    getFirestore().settings({ ignoreUndefinedProperties: true });
    initialized = true;
  }
  return getFirestore();
}

export async function listEngagements(tenantId: string): Promise<Engagement[]> {
  const snapshot = await db()
    .collection('engagements')
    .where('tenantId', '==', tenantId)
    .orderBy('updatedAt', 'desc')
    .limit(50)
    .get();
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Engagement);
}

export async function getEngagement(
  tenantId: string,
  id: string,
): Promise<Engagement | null> {
  const doc = await db().collection('engagements').doc(id).get();
  if (!doc.exists) return null;
  const data = doc.data() as Engagement;
  if (data.tenantId !== tenantId) return null; // tenant isolation
  return { ...data, id: doc.id };
}

export async function createEngagement(
  tenantId: string,
  input: Pick<Engagement, 'clientName' | 'clientEmail' | 'clientCompany' | 'brief' | 'transcript'>,
): Promise<string> {
  const now = new Date().toISOString();
  const ref = await db()
    .collection('engagements')
    .add({
      ...input,
      tenantId,
      phase: 'intake' as EngagementPhase,
      createdAt: now,
      updatedAt: now,
    });
  return ref.id;
}

/** Mark (or clear) a failed Coordinator kickoff on the engagement doc. */
export async function setTriggerError(id: string, value: boolean): Promise<void> {
  await db().collection('engagements').doc(id).update({
    _triggerError: value,
    updatedAt: new Date().toISOString(),
  });
}

async function listLogsForEngagement(engagementId: string): Promise<ActivityLog[]> {
  const snapshot = await db()
    .collection('engagements')
    .doc(engagementId)
    .collection('logs')
    .orderBy('timestamp', 'asc')
    .get();
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ActivityLog);
}

export async function listAllLogs(tenantId: string): Promise<EnrichedActivityLog[]> {
  const engagements = await listEngagements(tenantId);
  const results = await Promise.all(
    engagements.map(async (eng) => {
      const logs = await listLogsForEngagement(eng.id);
      return logs.map((log): EnrichedActivityLog => ({
        ...log,
        engagementId: eng.id,
        clientName: eng.clientName,
        clientCompany: eng.clientCompany,
        phase: eng.phase,
      }));
    })
  );
  return results.flat().sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
