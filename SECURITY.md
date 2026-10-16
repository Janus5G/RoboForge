# Security policy

RoboForge is a local-first engineering workbench, **not a certified controller for industrial equipment**. Do not expose the local Node.js API directly to untrusted networks or connect safety-critical machinery without independent review.

## Reporting a vulnerability

Please use **GitHub's private vulnerability reporting** feature if it is enabled for this repository, or contact the repository owner privately. Do not publish exploit details in a public issue before the maintainer has had an opportunity to evaluate them.

When reporting, provide: affected version, reproduction steps, affected endpoint/component, impact, and a suggested mitigation if known. Exclude passwords, tokens and identifiable customer or industrial data.

## Operator guidance

- Bind the development service to loopback unless protected by authenticated network controls.
- Keep provider credentials in private environment variables; never commit `.env`.
- Confirm every AI-generated command and any publish/send operation.
- Treat the bundled experimental integrations as unvalidated against real field equipment.
- Add authentication/TLS/reverse-proxy protections and a security assessment before network or multi-user deployment.

No specific security response or support timeframe is guaranteed.
