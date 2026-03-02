# Lightweight Checklist

Use this before a release if the goal is to make the widget smaller, faster, and cheaper to embed.

Current baseline from the latest local production build:

- `dist/kritibot-widget.js`: `255.21 kB`
- Gzip size: `77.28 kB`

Recommended target for the next pass:

- Raw bundle: under `240 kB`
- Gzip bundle: under `72 kB`

Completed in the current optimization pass:

- Removed `tailwind-merge` from the runtime path.
- Replaced Redux with a local React reducer/context.
- Disabled voice input by default behind `KRITIBOT_ENABLE_VOICE=true`.
- Added a build-time bundle budget check.

## 1. Measure First

- [ ] Record the current raw and gzip bundle sizes after `npm run build`.
- [ ] Keep a short before/after log for every optimization so size wins are measurable.
- [ ] Add a hard bundle budget in CI so regressions fail early.

## 2. Remove Runtime Weight

- [ ] Audit any new runtime dependency before adding it to the embed bundle.
- [ ] Prefer inline helpers over general-purpose runtime utilities when the widget only needs a narrow subset of behavior.
- [ ] Evaluate whether React compatibility is required or whether a smaller runtime such as `preact/compat` is acceptable.

## 3. Reduce Mount Cost

- [ ] Stop remounting the whole widget for every config update when a runtime update would be enough.
- [ ] Avoid unnecessary re-renders during streaming responses.
- [ ] Keep message rendering cheap for long sessions.
- [ ] Confirm open/close, clear, and destroy paths leave no pending network work behind.

## 4. Trim Feature Weight

- [ ] Keep voice input disabled unless the production deployment explicitly needs it.
- [ ] Remove UI paths that are not used in the real product flow.
- [ ] Recheck quick actions and demo-oriented content for production necessity.
- [ ] Review whether all workflow/table rendering branches are required in the embed bundle.

## 5. Shrink Asset Overhead

- [ ] Audit SVG imports and replace low-value icons with simpler inline markup where practical.
- [ ] Remove unused styles, utilities, and animations from `src/widget.css`.
- [ ] Keep the embed stylesheet focused on the widget only; avoid decorative CSS with low product value.
- [ ] Verify no source maps are shipped unless explicitly needed.

## 6. Reduce Network And Payload Size

- [ ] Keep `/chat` stream payloads minimal: send only fields the UI actually renders.
- [ ] Limit `rows_preview` size from the backend.
- [ ] Avoid sending verbose workflow metadata when a compact shape is enough.
- [ ] Confirm CDN compression is enabled for the bundle.

## 7. Dependency Audit

- [ ] Run a dependency review before each release and remove anything not used by the embed build.
- [ ] Prefer build-time utilities over runtime helpers where possible.
- [ ] Check whether any package is included only for local/dev flows and can be kept out of production paths.

## 8. Release Gate

- [ ] Rebuild after each optimization pass and compare against the baseline.
- [ ] Verify the widget still works on a real host page after each size-focused change.
- [ ] Do not trade bundle size for unstable runtime behavior.

## Highest-Value Candidates In This Repo

- [ ] Reduce full remount behavior on updates.
- [ ] Add a bundle-size budget to CI.
- [ ] Trim CSS and decorative animation overhead further.
- [ ] Audit whether quick actions and table UI belong in the core embed bundle.
