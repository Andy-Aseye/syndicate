'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { createEngagement } from '@/lib/firestore';

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
  });

  // 2. Trigger the Coordinator via the ADK API
  const payload = {
    brief: String(formData.get('brief') ?? ''),
    client_name: String(formData.get('clientName') ?? '') || undefined,
    client_company: String(formData.get('clientCompany') ?? '') || undefined,
  };
  await triggerCoordinatorAPI(id, payload);

  // 3. Navigate the user to the "Glass Engine" detail view
  redirect(`/engagements/${id}`);
}

export async function triggerCoordinatorAPI(engagementId: string, payload: any) {
  try {
    await fetch(`${process.env.ATLAS_COORDINATOR_URL}/a2a/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ engagement_id: engagementId, payload }),
    });
  } catch (err) {
    console.error('Coordinator API trigger failed:', err);
    // In a robust production environment, you might throw or push to a DLQ here
  }
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
