# Thingstead (CPMAI Tracker)

Local-first CPMAI tracking app with an optional LAN-capable server.

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

