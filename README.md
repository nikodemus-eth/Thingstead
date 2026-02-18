# Thingstead (CPMAI Tracker)

Sovereign local-first governance OS for AI agent fleets. Deterministic phases, formal gates, native multi-agent execution, and signed advisory DLC extensions — fully portable.

## License

GNU Affero General Public License v3.0 (AGPL-3.0-only). See `../LICENSE`.

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

