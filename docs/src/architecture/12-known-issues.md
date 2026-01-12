# Known Issues

Status: Living Document
Description: Current known limitations and bugs.

## Experience Module

- **React 19 / R3F Conflict**: There is a known dependency resolution issue between Next.js 16 (forcing React 19) and standard React Three Fiber.
- **Initial Load**: First load of the 3D scene may take 2-3 seconds as shaders compile.

## Listener Module

- **Transcription Latency**: On non-GPU machines, `faster-whisper` may take >1s for long audio clips.

## Documentation

- Some deep-linking in the documentation (specifically in `features/`) may reference specification files that are still in the drafting phase.

(This document is a stub. Checking GitHub/GitLab issues is recommended for the latest status.)
