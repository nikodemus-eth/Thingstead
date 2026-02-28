# Thingstead Commercial License

## Overview

Thingstead is dual-licensed:

1. **Open Source** — GNU Affero General Public License v3.0 (AGPL-3.0-only). See `LICENSE`.
2. **Commercial** — A separate commercial license for organizations that cannot comply with the AGPL.

## When You Need a Commercial License

The AGPL requires that any modified version of Thingstead — including network-accessible deployments (SaaS) — must make its complete source code available under the same license.

A commercial license is appropriate if:

- You embed Thingstead in a proprietary product or service.
- You modify Thingstead and deploy it over a network without releasing your source.
- You integrate Thingstead's governance kernel (`src/kernel/`) into a closed-source system.
- Your organization's policies prohibit AGPL dependencies.

## What the Commercial License Grants

- Permission to use, modify, and distribute Thingstead without AGPL source-disclosure obligations.
- Access to the same codebase and governance kernel as the open-source version.
- No additional features or separate builds — one codebase, two license options.

## What Remains Unchanged

Regardless of license choice:

- The governance kernel enforces the same rules. No license bypasses policy enforcement.
- The cryptographic ledger operates identically. Audit integrity is not license-dependent.
- Export bundles are format-compatible. A commercially licensed project's sovereignty bundle is verifiable by the open-source `tools/verify.mjs` and vice versa.

## Governance Kernel Licensing Note

The governance kernel (`src/kernel/`) is architecturally isolated with zero UI or browser dependencies. This isolation enables the kernel to be licensed independently if needed in the future — for example, as a standalone library for third-party governance tooling.

## Contact

For commercial licensing inquiries, contact the project maintainers via the repository.

## Contributor License Agreement

Contributors to the Thingstead repository agree that their contributions may be distributed under both the AGPL-3.0 and the commercial license. This dual-licensing structure requires that all contributions be licensable under both terms.
