# UI Color Semantic Tokens

Status: implemented foundation and migration reference for BOKEMO v0.9.5.

This document records the runtime color meanings before similar values are merged. A token is named for its purpose, even when it currently shares a value with another token. Components should consume semantic tokens; raw theme values and compatibility aliases belong only in the theme foundation.

## Architecture

The color system has three layers:

1. Theme identity: one of the twenty character/enemy sub/accent pairs and its theme-specific visualization colors.
2. UI semantics: canvas, surfaces, content, borders, status, interaction, and glass roles.
3. Game semantics: HP, progress, outcome, condition, rarity, and notification roles.

Light/dark appearance is independent from theme identity. The twenty themes therefore produce forty browser variants. The macOS Party Progress pane consumes the same theme identities in its isolated stylesheet.

## Actual theme identity values

The exact twenty-theme light and dark palette is defined in `Specification_8.1_UI_FOUNDATIONS.md` and implemented in `src/index.css`. Across every theme:

- `--surface-pane` is `#EEF5F5` in light mode and `#1E293B` in dark mode.
- `--hp-healed` resolves to `--theme-sub`.
- `--hp-track` resolves to `--theme-sub` at `0.10` opacity.
- `--hp-current-strong` resolves to `--hp-current`.

## Foundation tokens

### Theme identity and interaction

| Token | Purpose |
|---|---|
| `--theme-sub` | Information, ordinary selection, links, and normal progress |
| `--theme-accent` | Important action, warning, rare highlight, and negative condition |
| `--theme-on-sub` | Content rendered on a sub-colored fill |
| `--theme-on-accent` | Content rendered on an accent-colored fill |
| `--selection-fill` | Selected control or card fill |
| `--selection-fill-soft` | Weak selected/control backing |
| `--selection-border` | Selected control or card border |
| `--focus-ring` | Keyboard focus indication |
| `--link-text` | Normal in-application link |
| `--link-hover-surface` | Link/button hover backing |

### Surfaces

| Token | Purpose |
|---|---|
| `--surface-canvas` | Application/page background |
| `--surface-card` | Raised card background |
| `--surface-pane` | Pane and grouped-section background |
| `--surface-subtle` | Faint nested section |
| `--surface-muted` | Muted nested section |
| `--surface-strong` | Strong neutral fill or track |
| `--surface-disabled` | Disabled control fill |
| `--surface-interactive` | Ordinary interactive surface |
| `--surface-interactive-hover` | Hovered interactive surface |
| `--surface-overlay` | Toast, floating bubble, and overlay surface |
| `--surface-image-mask` | Readability mask over artwork |

### Content

The current gray steps remain individually labeled so a later merge cannot erase intended hierarchy.

| Token | Current light role |
|---|---|
| `--content-primary` | Black/near-black primary content |
| `--content-strong` | Gray 800 strong content |
| `--content-default` | Gray 700 ordinary content |
| `--content-secondary` | Gray 600 secondary content |
| `--content-muted` | Gray 500 muted content |
| `--content-faint` | Gray 400 faint content |
| `--content-disabled` | Disabled content |
| `--content-inverse` | Content on a colored/dark fill |

### Borders and status

| Token | Purpose |
|---|---|
| `--border-subtle` | Faint divider or inner-card boundary |
| `--border-default` | Normal card/control boundary |
| `--border-strong` | High-contrast boundary |
| `--status-error` | Error content |
| `--status-error-surface` | Error message backing |
| `--status-error-border` | Error boundary |
| `--status-warning` | Warning content |
| `--status-warning-surface` | Warning backing |
| `--status-warning-border` | Warning boundary |
| `--status-success` | Successful operation |
| `--status-info` | Informational operation |
| `--status-unread` | Unread badge or dot |

Error, unread, theme accent, and warning remain separate even when their present values are similar.

## Game semantic tokens

### HP and progress

| Token | Purpose |
|---|---|
| `--hp-current` | Current/remaining HP segment |
| `--hp-current-strong` | Retained stronger HP variant; compatibility/deprecation candidate |
| `--hp-healed` | HP restored during the displayed interval |
| `--hp-damage-taken` | HP lost during the displayed interval |
| `--hp-track` | Empty HP track, including its alpha |
| `--progress-primary` | Main progress fill |
| `--progress-secondary` | Weak/step sub-progress fill |
| `--progress-track` | Empty progress track |

### Outcomes, condition, rarity, and notifications

| Token | Mapping |
|---|---|
| `--condition-positive` | Theme sub |
| `--condition-negative` | Theme accent |
| `--outcome-success` | 80% theme sub mixed with white |
| `--outcome-draw` | 50% theme sub mixed with white |
| `--outcome-retreat` | 50% theme accent mixed with white |
| `--outcome-defeat` | 80% theme accent mixed with white |
| `--rarity-common` | Primary content |
| `--rarity-uncommon` | Primary content |
| `--rarity-elite` | Theme sub |
| `--rarity-boss` | Theme accent |
| `--rarity-mythic` | Theme accent |
| `--rarity-super-rare` | Theme accent plus typography emphasis |
| `--notification-normal-text` | Theme sub |
| `--notification-rare-text` | Theme accent |
| `--notification-surface` | Overlay/card surface |
| `--notification-surface-alpha` | Appearance-specific toast translucency (`0.8` light, `0.52` dark) |
| `--notification-border` | Theme-appropriate toast boundary |

## Glass, icons, and platform integration

| Token | Purpose |
|---|---|
| `--glass-highlight` | Glass highlight gradient stop |
| `--glass-surface` | Glass tint/fill |
| `--glass-border` | Glass boundary |
| `--glass-shadow` | Glass elevation shadow |
| `--glass-overlay` | Transparent gradient overlay |
| `--glass-selected-glow` | Selected glass control glow |
| `--icon-theme-sub-filter` | Raster icon filter for theme sub |
| `--icon-theme-accent-filter` | Raster icon filter for theme accent |
| `--icon-muted-filter` | Muted icon filter |
| `--icon-on-dark-filter` | Unlocked/icon-on-dark treatment |
| `--icon-secondary-opacity` | Secondary icon opacity |
| `--platform-browser-chrome` | Browser `theme-color` and safe-area tint |
| `--platform-desktop-surface` | Isolated desktop pane surface |

The browser chrome values remain: Kemo `#F3F4F6/#1F2937`, Luna `#F6EFE2/#2F2620`, and Laika `#E6EFE7/#17281F` for light/dark respectively.

## Compatibility and migration rules

- `--color-sub`, `--color-accent`, `--color-pane`, and the former HP variables remain temporary aliases for existing code and generated Tailwind utilities.
- New or migrated UI must use semantic Tailwind names such as `bg-surface-card`, `text-content-muted`, `border-line-default`, `text-status-error`, and `bg-status-unread`.
- Fixed Blue utilities must not represent the active theme. Selection, links, and focus use semantic theme aliases.
- Fixed Red is allowed only behind error/unread semantics; theme accent is not a substitute for system errors.
- Component-specific artwork masks and glass variants may retain dedicated semantic component tokens until their visual values are deliberately merged.
- Equal values are not sufficient reason to merge tokens. Merge only after confirming their meanings and light/dark behavior are equivalent.
- Semantic aliases must be refreshed on each theme/appearance scope; declaring a `var(...)` alias only on `:root` freezes its inherited computed value to the root Kemo palette.
- Theme contract tests must cover all three identities in light and dark appearance, browser chrome mapping, desktop snapshot mapping, and the absence of legacy theme-blue utilities in migrated components.
