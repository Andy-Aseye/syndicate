from temporalio import activity
from typing import Any
from agents.shared import A2AClient
from google.cloud import firestore

# We use a global A2A client for the activities
a2a_client = A2AClient()
db = firestore.AsyncClient()

@activity.defn
async def update_firestore_phase(data: dict[str, str]) -> None:
    engagement_id = data["engagement_id"]
    phase = data["phase"]
    activity.logger.info(f"Updating firestore phase for {engagement_id} to {phase}")
    try:
        await db.collection("engagements").document(engagement_id).update({"phase": phase})
    except Exception as e:
        activity.logger.error(f"Failed to update firestore phase: {e}")

@activity.defn
async def run_adk_strategy_phase(engagement_data: dict[str, Any]) -> dict[str, Any]:
    engagement_id = engagement_data["id"]
    payload = engagement_data.get("payload", {})
    
    activity.logger.info(f"Running discovery for {engagement_id}")
    try:
        discovery_res = await a2a_client.call("discovery", engagement_id=engagement_id, payload=payload)
    except Exception as e:
        activity.logger.warning(f"A2A call to discovery failed: {e}")
        # In a hackathon, if the sub-agent isn't running, we return mock data so the workflow continues.
        discovery_res = type('Mock', (object,), {"output": {"extracted": True}})()

    activity.logger.info(f"Running strategy for {engagement_id}")
    try:
        strategy_res = await a2a_client.call("strategy", engagement_id=engagement_id, payload=discovery_res.output)
    except Exception as e:
        activity.logger.warning(f"A2A call to strategy failed: {e}")
        strategy_res = type('Mock', (object,), {"output": {"strategy": "default strategy", "engagement_id": engagement_id}})()
    
    return strategy_res.output

@activity.defn
async def run_adk_sandbox_developer_phase(payload: dict[str, Any]) -> dict[str, Any]:
    engagement_id = payload.get("engagement_id", "unknown")
    
    activity.logger.info(f"Running developer (sandbox) for {engagement_id}")
    try:
        dev_res = await a2a_client.call("developer", engagement_id=engagement_id, payload=payload)
        return dev_res.output
    except Exception as e:
        activity.logger.warning(f"A2A call to developer failed: {e}")
        return {"status": "mock_success", "lovable_url": "https://lovable.dev/app/123"}
