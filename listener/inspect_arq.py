import asyncio
from arq import create_pool
from arq.connections import RedisSettings
from arq.jobs import Job
from app.config import settings

async def inspect_job():
    print("Connecting to Redis...")
    try:
        redis = await create_pool(
            RedisSettings(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                database=settings.REDIS_DB
            )
        )
        print("Connected.")
        
        # Enqueue a dummy job
        job = await redis.enqueue_job('test_job')
        print(f"Queued job: {job.job_id}")
        
        # Inspect job info
        job_instance = Job(job.job_id, redis)
        info = await job_instance.info()
        
        print(f"\nJob Info Type: {type(info)}")
        print(f"Job Info Dir: {dir(info)}")
        print(f"Job Info Dict: {info.__dict__ if hasattr(info, '__dict__') else 'No __dict__'}")
        
        # Check for status method on Job instance
        print(f"\nChecking job.status()...")
        try:
            status = await job_instance.status()
            print(f"Job Status: {status}")
        except Exception as e:
            print(f"Error calling job.status(): {e}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(inspect_job())
