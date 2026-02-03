"""Voice Session Routes.

Handles real-time WebSocket connections for voice chat.
Adapts the Moshi server loop for FastAPI/Starlette WebSockets.
"""

import asyncio
import json
import logging

import numpy as np  # Added for audio processing
import torch
from app.config import PERSONA_CONFIG
from fastapi import APIRouter, WebSocket
from starlette.websockets import WebSocketState

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/voice-session")
async def voice_session_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time voice session.

    Protocol:
    1. Client connects.
    2. Client sends configuration JSON:
       {
         "type": "configure",
         "persona_id": "lumina",
         "mode": "default"
       }
    3. Server loads voice prompt.
    4. Bi-directional streaming:
       - Client sends Float32 PCM chunks (binary).
       - Server sends Float32 PCM chunks (binary, prefixed with \x01).
       - Server sends Text updates (JSON, prefixed with \x02).
    """
    await websocket.accept()

    if not hasattr(websocket.app.state, "moshi") or websocket.app.state.moshi is None:
        await websocket.close(code=1011, reason="Model not loaded")
        return

    moshi_state = websocket.app.state.moshi

    # Session State
    close_event = asyncio.Event()
    # opus_writer = sphn.OpusStreamWriter(moshi_state.mimi.sample_rate)
    # opus_reader = sphn.OpusStreamReader(moshi_state.mimi.sample_rate)

    # Configuration Handshake
    try:
        config_msg = await websocket.receive_text()
        config = json.loads(config_msg)
        persona_id = config.get("persona_id", "lumina")

        if persona_id not in PERSONA_CONFIG:
            logger.error(f"Invalid persona: {persona_id}")
            await websocket.close(code=1008, reason="Invalid persona")
            return

        persona_cfg = PERSONA_CONFIG[persona_id]
        # voice_id = persona_cfg["voice_id"]
        text_prompt = persona_cfg["text_prompt"]

        # Load Voice Prompt
        # In this implementation we assume voice prompts are cached or handling them simplistically
        # For a robust implementation, we'd need the voice prompt dir path from settings
        # Here we rely on Moshi's internal handling or need to construct path.
        # Ideally, we pass the path. For now, let's assume we can pass the ID and Moshi state
        # handles it or we might need to look up the file.
        # Re-using logic from server.py is hard without the exact directory structure context
        # available at runtime here.
        # We will attempt to load if it's a file, otherwise we might fail.
        # HACK: For now, we update the LM Gen state directly if possible with just text prompt

        moshi_state.lm_gen.text_prompt_tokens = moshi_state.text_tokenizer.encode(
            f"<system> {text_prompt} <system>"
        )

        # Reset streaming states
        moshi_state.mimi.reset_streaming()
        moshi_state.other_mimi.reset_streaming()
        moshi_state.lm_gen.reset_streaming()

        logger.info(f"Session started for persona: {persona_id}")

    except Exception as e:
        logger.error(f"Handshake failed: {e}")
        await websocket.close(code=1008, reason="Handshake error")
        return

    # --- Main Audio Processing Loops ---

    # --- Main Audio Processing Loops ---

    async def recv_loop():
        """Receive audio from client -> OpusReader."""
        logger.info("recv_loop started")
        try:
            while not close_event.is_set():
                if websocket.client_state == WebSocketState.DISCONNECTED:
                    logger.info("recv_loop: WebSocket disconnected state detected")
                    close_event.set()
                    break

                # We expect binary PCM messages
                try:
                    message = await asyncio.wait_for(websocket.receive(), timeout=0.1)
                except asyncio.TimeoutError:
                    continue

                if message["type"] == "websocket.disconnect":
                    logger.info("recv_loop: received websocket.disconnect message")
                    close_event.set()
                    break

                if "bytes" in message and message["bytes"]:
                    # Client sends Float32 PCM bytes
                    payload = message["bytes"]
                    # Assume client sends raw Float32 PCM at 24kHz
                    pcm_chunk = np.frombuffer(payload, dtype=np.float32)

                    # We need to queue this for the processing loop
                    await pcm_in_queue.put(pcm_chunk)
        except Exception as e:
            logger.error(f"Receive loop error: {e}", exc_info=True)
            close_event.set()
        finally:
            logger.info("recv_loop ended")

    async def processing_loop():
        """Mimi Encode -> Moshi -> Mimi Decode -> OpusWriter."""
        logger.info("processing_loop started")
        try:
            frame_size = int(moshi_state.mimi.sample_rate / moshi_state.mimi.frame_rate)
            all_pcm_data = None
            chunks_processed = 0

            while not close_event.is_set():
                # Yield to other tasks
                await asyncio.sleep(0.005)  # Slight delay to prevent busy loop

                # 1. Get PCM from input queue
                try:
                    # Non-blocking check or short timeout
                    while not pcm_in_queue.empty():
                        chunk = await pcm_in_queue.get()
                        if all_pcm_data is None:
                            all_pcm_data = chunk
                        else:
                            all_pcm_data = np.concatenate((all_pcm_data, chunk))

                        chunks_processed += 1

                except Exception as e:
                    logger.error(f"Error getting from queue: {e}")

                # 2. Process complete frames
                if all_pcm_data is not None:
                    while all_pcm_data.shape[-1] >= frame_size:
                        logger.info("Processing frame...")
                        chunk = all_pcm_data[:frame_size]
                        all_pcm_data = all_pcm_data[frame_size:]

                        chunk_tensor = torch.from_numpy(chunk)
                        chunk_tensor = chunk_tensor.to(device=moshi_state.device)[None, None]

                        # Encode (Mimi)
                        codes = moshi_state.mimi.encode(chunk_tensor)
                        _ = moshi_state.other_mimi.encode(chunk_tensor)  # Keep sync

                        # LM Step (Moshi)
                        for c in range(codes.shape[-1]):
                            tokens = moshi_state.lm_gen.step(codes[:, :, c : c + 1])
                            if tokens is None:
                                continue

                            # Decode (Mimi)
                            main_pcm = moshi_state.mimi.decode(tokens[:, 1:9])
                            _ = moshi_state.other_mimi.decode(tokens[:, 1:9])

                            main_pcm = main_pcm.cpu()
                            out_pcm_np = main_pcm[0, 0].detach().numpy()

                            # Send Audio Callback
                            out_bytes = out_pcm_np.tobytes()
                            await websocket.send_bytes(b"\x01" + out_bytes)

                            # Handle Text Tokens
                            text_token = tokens[0, 0, 0].item()
                            if text_token not in (0, 3):
                                _text = moshi_state.text_tokenizer.id_to_piece(text_token)
                                _text = _text.replace(" ", " ")
                                msg = json.dumps({"type": "text-delta", "text": _text})
                                await websocket.send_text(msg)

        except Exception as e:
            logger.error(f"Processing loop error: {e}", exc_info=True)
            close_event.set()
        finally:
            logger.info("processing_loop ended")

    # Communication Queues
    pcm_in_queue = asyncio.Queue()

    # Start Handshake (Send Ready bytes)
    logger.info("Sending handshake (ready bytes)")
    await websocket.send_bytes(b"\x00")

    # Run loops
    # CRITICAL: We must acquire the lock because moshi_state.lm_gen has shared internal state.
    # This limits the service to one active conversation at a time per instance.
    async with moshi_state.lock:
        logger.info(f"Lock acquired for session: {persona_id}")
        tasks = [asyncio.create_task(recv_loop()), asyncio.create_task(processing_loop())]

        try:
            done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            logger.info(f"One of the tasks finished. Done: {done}")
        finally:
            logger.info(f"Cleaning up session {persona_id}")
            close_event.set()
            for task in tasks:
                if not task.done():
                    task.cancel()
            # Wait for cancellations
            await asyncio.gather(*tasks, return_exceptions=True)

    if websocket.client_state == WebSocketState.CONNECTED:
        logger.info("Closing websocket")
        await websocket.close()


# Temporary placeholder until we copy the full loop logic
