from datetime import timedelta
from temporalio import workflow

with workflow.unsafe.imports_passed_through():
    import logging

log = logging.getLogger("coordinator.workflow")

@workflow.defn
class AtlasEngagementWorkflow:
    def __init__(self) -> None:
        self._current_phase = "INTAKE"
        self._tool_confirmed = False
        self._agent_payload = {}
        self._user_adjustments = {}

    @workflow.run
    async def run(self, engagement_data: dict) -> dict:
        log.info(f"Starting workflow for engagement {engagement_data.get('id')}")
        
        # Phase 1: Discovery & Strategy (ADK Micro-Graph)
        self._current_phase = "STRATEGY_GENERATION"
        self._agent_payload = await workflow.execute_activity(
            "run_adk_strategy_phase",
            engagement_data,
            start_to_close_timeout=timedelta(minutes=15)
        )

        # Phase 2: Native ADK Tool Confirmation / HITL Gate
        self._current_phase = "AWAITING_APPROVAL"
        
        await workflow.execute_activity(
            "update_firestore_phase",
            {"engagement_id": engagement_data.get("id"), "phase": "paused"},
            start_to_close_timeout=timedelta(minutes=1)
        )
        
        await workflow.wait_condition(lambda: self._tool_confirmed)
        
        await workflow.execute_activity(
            "update_firestore_phase",
            {"engagement_id": engagement_data.get("id"), "phase": "build"},
            start_to_close_timeout=timedelta(minutes=1)
        )
        
        # Apply user feedback
        if self._user_adjustments:
            self._agent_payload.setdefault("context", {}).update(self._user_adjustments)

        # Phase 3: Secure Execution inside Vertex AI Sandbox
        self._current_phase = "SECURE_GENERATION"
        generation_results = await workflow.execute_activity(
            "run_adk_sandbox_developer_phase",
            self._agent_payload,
            start_to_close_timeout=timedelta(minutes=20)
        )

        self._current_phase = "COMPLETED"
        return {
            "engagement_id": engagement_data.get("id"),
            "status": "SUCCESS",
            "payload": generation_results
        }

    @workflow.signal
    def approve_tool_execution(self, user_feedback: dict) -> None:
        if self._current_phase == "AWAITING_APPROVAL":
            if user_feedback.get("approved"):
                self._user_adjustments = user_feedback.get("adjustments", {})
                self._tool_confirmed = True

    @workflow.query
    def get_system_status(self) -> dict:
        return {
            "phase": self._current_phase,
            "payload_snapshot": self._agent_payload
        }
