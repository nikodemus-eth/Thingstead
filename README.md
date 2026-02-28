# Thingstead (CPMAI Tracker)

Sovereign local-first governance OS for AI agent fleets. Deterministic phases, formal gates, native multi-agent execution, and signed advisory DLC extensions — fully portable.

## License

Thingstead is dual-licensed:

- **Open Source**: [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0-only)
- **Commercial**: Available for organizations that cannot comply with the AGPL. See [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md).

The AGPL ensures that anyone deploying Thingstead — including over a network — must share their modifications under the same license. If your use case requires proprietary modifications, the commercial license removes this obligation.

The governance kernel (`src/kernel/`) is architecturally isolated and may be independently licensed in the future.

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

