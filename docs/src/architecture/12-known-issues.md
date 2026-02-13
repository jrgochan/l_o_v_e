# Known Issues

**Status**: Living Document
**Last Updated:** February 2026

## Experience Module

- **Initial Load**: First load of the 3D scene may take 2-3 seconds as shaders compile. Subsequent loads are faster due to shader caching.
- **Path Display**: Transition strategies were not appearing when loaded from the path matrix cache. Fixed by implementing on-demand strategy fetching in `WaypointDetailModal.tsx`.

## Listener Module

- **Transcription Latency**: On non-GPU machines, `faster-whisper` may take >1s for long audio clips. GPU acceleration is recommended for production.

## Documentation

- Some deep-linking in the documentation (specifically in `features/`) may reference specification files that are still in the drafting phase.
- Documentation coverage is being systematically expanded — see the ongoing documentation audit.

## Resolved Issues

- ~~**React 19 / R3F Conflict**: Dependency resolution issue between Next.js 16 and React Three Fiber~~ — Resolved. R3F v9 supports React 19 natively.
