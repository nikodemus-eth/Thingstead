# Open Source Release Checklist (v1.0 Target)

This document is a pragmatic checklist for shipping Thingstead as an open-source release and producing portable, offline-capable distributions.

## Must-Have

- [x] Project license selected and committed with a root `LICENSE` file (AGPL-3.0-only).
- [x] Third-party notices generated and included in distributions (`Thingstead/THIRD_PARTY_NOTICES.txt`).
- [x] Portable bundles build and run offline (no remote font/CDN imports).
- [x] Unit/integration/e2e tests pass.
- [x] No secrets committed (keys, certs, tokens).

## Recommended

- [ ] `SECURITY.md` (vuln reporting channel)
- [ ] `CONTRIBUTING.md` (how to build/test/submit PRs)
- [ ] `CODE_OF_CONDUCT.md`
- [ ] Release notes entry (`CHANGELOG.md`)

## Distribution

Portable bundles are produced by:

```
node scripts/package/thingstead-portable.mjs
```

Outputs land in `releases/`.
