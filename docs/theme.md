# Theme (Nordic Minimal)

Thingstead uses tokenized CSS variables (`--ts-*`) as the global theme surface. Component CSS modules should reference tokens (directly or via the legacy aliases) and must not introduce gradients.

## Tokens

- `--ts-bg`: app background (off-black)
- `--ts-surface-1`: primary surface (charcoal)
- `--ts-surface-2`: nested surface (slightly lighter charcoal)
- `--ts-text`: primary text (bone)
- `--ts-text-muted`: muted text (still readable)
- `--ts-border`, `--ts-border-strong`: borders
- `--ts-accent`, `--ts-accent-hover`, `--ts-accent-pressed`: interactive highlight (iron blue)
- `--ts-success`: muted moss
- `--ts-warning`: muted ochre
- `--ts-danger`: muted danger red
- `--ts-focus-ring`: focus-visible outline color

## Accessibility Defaults

- Focus: all interactive elements get a consistent `:focus-visible` outline (no outline removal without replacement).
- Reduced motion: `prefers-reduced-motion: reduce` clamps transitions/animations close to zero.
- Tap targets: baseline `min-height` is enforced for buttons/inputs (40px).
- State cues: status/gate state must not rely on color alone; always keep a text label and, where available, existing glyphs/badges.

## Rules

- No gradients anywhere (flat fills only).
- No glow-style focus or neon accents.
- Disabled UI should remain legible (avoid opacity-only disabling).

