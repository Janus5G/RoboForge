# Acceptance matrix — RoboForge 0.2.0

## Automated checks provided

- Node HTTP API smoke and regression tests (`npm test` from `backend`).
- Seven plugin IDs and 17 capability IDs checked.
- Mock Ollama and mock OpenAI-compatible chat-completion generation tested; no paid provider contacted.
- Generated file extraction: safe paths and deduplication tested.
- Invalid prompts/providers/origins and unsupported external endpoint guards tested.
- TypeScript/TSX source syntax and local import path consistency verified locally.

## Require execution in target environment

- Full `npm run build` needs frontend dependencies; environment used to produce ZIP had no registry access.
- UI browser smoke test after installation (Overview > Settings > AI Generator > Code Viewer > each plugin).
- Live Ollama test with actual installed model; OpenAI and DeepSeek tests using owner's approved keys.
- ROS2 rosbridge browser WebSocket topics/nodes using target ROS distribution and message types.
- MQTT with actual MQTT WebSocket broker and credentials/TLS policy.
- OPC UA with optional driver, matching trust policy and a read-only local device or simulator.
- Isaac Sim with actual ROS2 bridge; only /clock observation exposed.
- Siemens endpoint product-specific configuration and authorization.
- Arduino Web Serial in secure context with compatible USB device.
- Home Assistant authenticated WebSocket in approved environment.
- Docker build/run and host Ollama reachability test on user's workstation.
- Compatibility against other apps using RoboForge API; no source from these apps was supplied.

## Safety limits

No automatic code execution, compiler runs, device firmware upload, actuator control, PLC write or robot-motion command dispatch; ROS and MQTT publish require a user action and confirmation. Read-only state does not equal industrial validation. GUI does not claim to be production-certified.
