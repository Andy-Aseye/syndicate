import asyncio
import logging
from dotenv import load_dotenv
load_dotenv()

from temporalio.client import Client
from temporalio.worker import Worker

from agents.coordinator.workflow import AtlasEngagementWorkflow
from agents.coordinator.activities import run_adk_strategy_phase, run_adk_sandbox_developer_phase, update_firestore_phase

async def main():
    logging.basicConfig(level=logging.INFO)
    logging.info("Connecting to Temporal server...")
    
    try:
        client = await Client.connect("localhost:7233")
    except Exception as e:
        logging.error(f"Failed to connect to Temporal: {e}. Is docker-compose up running?")
        return

    worker = Worker(
        client,
        task_queue="atlas-engagement-queue",
        workflows=[AtlasEngagementWorkflow],
        activities=[run_adk_strategy_phase, run_adk_sandbox_developer_phase, update_firestore_phase],
    )
    logging.info("Starting Temporal Worker for Atlas Coordinator...")
    await worker.run()

if __name__ == "__main__":
    asyncio.run(main())
