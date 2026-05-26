import asyncio
from google.cloud import firestore
from dotenv import load_dotenv

load_dotenv()

async def test():
    db = firestore.AsyncClient()
    engs = await db.collection("engagements").get()
    for eng in engs:
        logs = await db.collection("engagements").document(eng.id).collection("logs").get()
        print(eng.id, len(logs))

asyncio.run(test())
