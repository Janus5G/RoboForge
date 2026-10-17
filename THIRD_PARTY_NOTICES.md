# Third-party integrations and license boundaries

RoboForge Studio source code: Copyright (c) 2026 Janus5G, MIT License (see `LICENSE`).

## Refract Studio

Official source: https://github.com/Janus5G/Refract-Studio . Refract remains an independent repository. RoboForge imports a callable compiler adapter **only from an operator-supplied trusted local checkout**. RoboForge does not redistribute Refract Studio, its original ChromaPlex toolchains, Optical Routing Simulator, PRISME files or any executable binaries. Preserve each included third-party copyright and license; the optical simulator's provenance must be checked separately before redistribution.

## DeepSeek Janus

Official source: https://github.com/deepseek-ai/Janus . Code is under `LICENSE-CODE` (MIT; Copyright 2023 DeepSeek). Model weights have a separate `LICENSE-MODEL` DeepSeek agreement and use restrictions. RoboForge does not download, package or execute weights and does not present a working Janus inference runtime in v0.4.0. No model support is implied by registration.

## REA (morluto/rea)

Official source: https://github.com/morluto/rea . Upstream MIT License, copyright by its owner, separate from RoboForge. Installed separately at user request and disabled by default in RoboForge. No upstream REA source bundled.

## Other integrations

ROS 2, OPC UA, MQTT/EMQX, NVIDIA Isaac Sim, Siemens Xcelerator, Arduino and Home Assistant are independent trademarks, products, services, specifications and libraries. Bundled compatibility modules do not confer rights to distribute proprietary SDKs or warrant manufacturer certification. Consult dependency licenses before redistribution.

## ChromaPlex Coding Agent (optional)

Project: https://github.com/Janus5G/Chromaplex-Coding-Agent ; MIT-licensed independent Linux application. RoboForge does NOT copy or redistribute its security/compiler code, dependencies, models or desktop GUI. When explicitly enabled, it calls a separately installed trusted checkout's approved Python functions. The original Secure Compile Gate and its third-party license obligations remain authoritative. Installing the standalone `.deb` is a separate user action.
