# Thingstead (CPMAI Tracker)

Sovereign local-first governance OS for AI agent fleets. Deterministic phases, formal gates, native multi-agent execution, and signed advisory DLC extensions — fully portable.

## License

Thingstead is dual-licensed:

- **Open Source**: [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0-only)
- **Commercial**: Available for organizations that cannot comply with the AGPL. See [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md).

The AGPL ensures that anyone deploying Thingstead — including over a network — must share their modifications under the same license. If your use case requires proprietary modifications, the commercial license removes this obligation.

The governance kernel (`src/kernel/`) is architecturally isolated and may be independently licensed in the future.

## Supported Governance Tracks

Thingstead ships with four governance tracks, each encoding a distinct lifecycle methodology:

| Track | Phases | Gate Model | Description |
|-------|--------|------------|-------------|
| **CPMAI** | 6 (sequential) | Sequential / Strict | Cognitive Project Management in AI (PMI-CPMAI) — the original Thingstead lifecycle |
| **AIPO** | 8 (sequential) | Sequential / Strict | AI Project Office governance with classification levels and approval signatures |
| **PMI Waterfall** | 8 (W1–W8) | Sequential / Strict | Traditional PMI waterfall with formal change control, baseline locking, and tiered waiver friction |
| **PMI Agile** | 8 (A1–A8) | Iterative / Release-based | Sprint-loop agile with backlog-governed change control; phases 2–4 (Sprint Planning, Execution, Review) are iterative |

Tracks are defined in the governance kernel (`src/kernel/governanceTracks.js`) and each maps to a specific gate mode, enforcement level, and change control strategy via `src/kernel/trackPolicies.js`.

## Build & Test

```sh
cd Thingstead
npm install
npm test
npm run lint
npm run build
npm run test:e2e
```

## Run

```sh
cd Thingstead
npm run dev
```

LAN-friendly dev:

```sh
cd Thingstead
npm run dev:lan
```

## Portable Distributions

From the repo root:

```sh
node scripts/package/thingstead-portable.mjs
```

Outputs land in `../releases/`.

