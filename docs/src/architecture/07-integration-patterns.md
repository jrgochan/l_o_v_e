# Integration Patterns

Status: Placeholder Stub
Description: This document details how the four L.O.V.E. modules communicate.

## Core Pattern: REST APIs

The primary communication method between Listener, Observer, and Versor is via synchronous REST API calls over HTTP.

- **Listener -> Observer**: Posts analyzed VAC results to `/observer/state`.
- **Observer -> Versor**: Posts VAC coordinates to `/versor/calculate` to get quaternion rotations.
- **Experience -> Observer**: Polls or subscribes to `/observer/state` to get the current emotional state.

## Secondary Pattern: WebSocket

Real-time updates for chat and session metrics are handled via WebSockets in the Observer module.

## Asynchronous Processing

- **Listener**: Uses Redis and Arq for background task processing (transcription, extensive analysis).

(This document is a stub. Full details to be populated from system architecture reviews.)
