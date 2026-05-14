# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
bun install          # install dev dependencies
bun run dev          # watch mode — rebuilds dist/widget.js on save
bun run build        # one-shot minified build → dist/widget.js
bun run typecheck    # type-check only (tsc --noEmit)
bun run lint         # ESLint
bun run lint:fix     # ESLint with auto-fix
bun run format       # Prettier write
bun run format:check # Prettier check
```

There are no tests. Validation is via `typecheck` + `lint`.

## Architecture

This is an iOS [Scriptable](https://scriptable.app) widget. The entire app is three TypeScript source files that Bun bundles into a single `dist/widget.js` (CJS, minified, browser target). That file is loaded by Scriptable directly — there is no server, no runtime environment beyond the Scriptable JS engine, and no npm packages at runtime. All imports in `devDependencies` are type definitions only.

**Source files:**

- `src/widget.ts` — Entry point. Fetches GPS location via Scriptable's `Location` API, calls the Open-Meteo forecast API, converts temperatures from °C (API) to °F (display + gear logic), then builds and presents a `ListWidget`. Exports `{ main }` for the auto-updater pattern.
- `src/schedule.ts` — Static weekly workout schedule. Edit `weeklySchedule` here to change which days are outdoor runs vs. rest. The `isOutdoor` flag controls whether weather and gear advice are fetched/shown.
- `src/gearAdvice.ts` — Pure function `getGearAdvice(w: WeatherConditions)` that returns clothing layers and an optional note. All temperature thresholds are in °F and tuned for high-intensity running. The apparent temperature input must already be in °F.

**Data flow:**

```
GPS (Location API)
  → Open-Meteo forecast API (hourly, °C)
    → celsiusToFahrenheit()
      → getGearAdvice() [outdoor days only]
        → ListWidget render
```

**Key unit convention:** The `Weather` interface in `widget.ts` stores temperatures in °C exactly as the API returns them. Conversion to °F happens in `main()` before any display or call to `getGearAdvice`. The `WeatherConditions` interface in `gearAdvice.ts` expects °F — never pass raw API values to it.

**Scriptable-specific APIs used:** `Location`, `Request`, `ListWidget`, `Font`, `Color`, `Script`, `config` — all are global in the Scriptable runtime and typed via `@types/scriptable-ios`. Bun's `--target browser` build excludes Node.js built-ins, which is correct since none are available in Scriptable.

**Deploying:** Copy `dist/widget.js` into Scriptable manually, or use the auto-updater script in the README which polls GitHub Releases (30-minute gate + version tag check).
