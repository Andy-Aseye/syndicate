'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { createEngagement, getEngagement, setTriggerError } from '@/lib/firestore';

export async function submitEngagementAction(formData: FormData) {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error('unauthenticated');

  const tenantId = orgId ?? userId;

  // 1. Create the engagement record in Firestore
  const id = await createEngagement(tenantId, {
    clientName: String(formData.get('clientName') ?? ''),
    clientEmail: String(formData.get('clientEmail') ?? '') || undefined,
    clientCompany: String(formData.get('clientCompany') ?? '') || undefined,
    brief: String(formData.get('brief') ?? ''),
    transcript: String(formData.get('transcript') ?? '') || undefined,
  });

  // 2. Trigger the Coordinator via the ADK API
  const payload = {
    brief: String(formData.get('brief') ?? ''),
    transcript: String(formData.get('transcript') ?? '') || undefined,
    client_name: String(formData.get('clientName') ?? '') || undefined,
    client_company: String(formData.get('clientCompany') ?? '') || undefined,
  };
  const triggered = await triggerCoordinatorAPI(id, payload);
  if (!triggered) {
    // Surface the failure on the engagement doc so the detail page can show
    // an error banner with a retry button (instead of silently stuck at intake).
    try {
      await setTriggerError(id, true);
    } catch (err) {
      console.error('Failed to mark trigger error:', err);
    }
  }

  // 3. Navigate the user to the "Glass Engine" detail view
  redirect(`/engagements/${id}`);
}

export async function triggerCoordinatorAPI(engagementId: string, payload: any): Promise<boolean> {
  try {
    const res = await fetch(`${process.env.ATLAS_COORDINATOR_URL}/a2a/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ engagement_id: engagementId, payload }),
    });
    if (!res.ok) {
      console.error('Coordinator API trigger failed with status:', res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Coordinator API trigger failed:', err);
    // In a robust production environment, you might throw or push to a DLQ here
    return false;
  }
}

export async function retryKickoffAction(engagementId: string): Promise<{ ok: boolean }> {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error('unauthenticated');

  const tenantId = orgId ?? userId;
  const engagement = await getEngagement(tenantId, engagementId);
  if (!engagement) return { ok: false };

  const payload = {
    brief: engagement.brief ?? '',
    transcript: engagement.transcript || undefined,
    client_name: engagement.clientName || undefined,
    client_company: engagement.clientCompany || undefined,
  };
  const triggered = await triggerCoordinatorAPI(engagementId, payload);
  try {
    await setTriggerError(engagementId, !triggered);
  } catch (err) {
    console.error('Failed to update trigger error flag:', err);
  }
  revalidatePath(`/engagements/${engagementId}`);
  return { ok: triggered };
}

import { revalidatePath } from 'next/cache';

export async function approveEngagementAction(engagementId: string, adjustments: string = "") {
  try {
    const payload = {
      approved: true,
      adjustments: { instructions: adjustments }
    };
    await fetch(`${process.env.ATLAS_COORDINATOR_URL}/api/engagements/${engagementId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    // Revalidate the page so it pulls the latest 'build' phase from Firestore
    revalidatePath(`/engagements/${engagementId}`);
  } catch (err) {
    console.error('Failed to approve engagement:', err);
  }
}

export async function submitLiveUrlAction(engagementId: string, liveUrl: string) {
  try {
    await fetch(`${process.env.ATLAS_COORDINATOR_URL}/api/engagements/${engagementId}/live-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ live_url: liveUrl }),
    });
    // Revalidate so the page pulls the latest 'review' phase from Firestore
    revalidatePath(`/engagements/${engagementId}`);
  } catch (err) {
    console.error('Failed to submit live URL:', err);
  }
}
