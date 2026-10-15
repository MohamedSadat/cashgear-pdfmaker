## What

<!-- One tool or one change per PR. Link the spec in docs/tools/ for a new tool. -->

## Checklist

- [ ] Spec written first (`docs/tools/<slug>.md`) for a new tool
- [ ] Tests written before the code; `pnpm check`, `pnpm test:e2e` and pytest pass locally
- [ ] English **and** Arabic strings added (the parity test passes)
- [ ] No physical left/right classes; user text inside `<bdi>`
- [ ] No new dependency outside the license allow-list (`pnpm licenses:check`)
- [ ] Browser tools send no file bytes over the network
