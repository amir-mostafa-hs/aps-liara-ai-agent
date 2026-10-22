# ADR-0002: First End-to-End Deployment Target and SRE Scenario

## Context

The hackathon requires demonstrating a real end-to-end deployment on Liara and evidence-based troubleshooting (SRE). Introducing multi-service architectures (like databases or object storage) in the first pass introduces provisioning latency, billing friction, and high operational risk during live demonstration.

## Decision

We select a standalone, lightweight Node.js web application running on Liara's native `nodejs` platform as the initial end-to-end deployment target.
The SRE troubleshooting loop will be demonstrated through a controlled configuration failure:
1. The application requires a mandatory runtime environment variable without which it crashes or exits with non-zero status.
2. The agent inspects Liara runtime logs (`liara logs`), extracts the crash stack trace, and identifies the missing configuration.
3. The agent formulates a proposed remediation plan to set the missing variable via `liara env set`.
4. The remediation action is gated behind user approval, applied upon confirmation, and verified by an HTTP 200 health check against the public URL.

## Consequences

Testing and automated verification can be completed rapidly without provisioning external DBaaS instances. The end-to-end deployment and diagnosis pipeline is proven with concrete, observable evidence.

