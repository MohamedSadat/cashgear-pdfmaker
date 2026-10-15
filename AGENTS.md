# AGENTS.md

Rules for every coding agent (Claude Code, Codex) and every human working in this repo.
`CLAUDE.md` imports this file; keep all rules here.

## Product

A PDF toolkit in the style of PDF Candy, on two surfaces: a Next.js website and (phase 4) a Windows
Electron app that reuses the same React UI. Light tools run in the browser and **never upload
files**. Heavy tools (phase 2) run on Python workers. Every page ships in English and Arabic (RTL).
The product name and domain are undecided: use `BRAND` from `@repo/ui/brand` and never hard-code a
name.

## Stack

| Layer       | Choice                                                          |
| ----------- | --------------------------------------------------------------- |
| Monorepo    | pnpm 12 workspaces + Turborepo 2                                |
| Web         | Next.js 16 (App Router), React 19, TypeScript 6                 |
| UI          | Tailwind CSS 4, shadcn/ui-style components, Radix, dnd-kit      |
| i18n        | next-intl 4 in `apps/web`; `use-intl` inside `packages/ui`      |
| Browser PDF | `@cantoo/pdf-lib` (maintained pdf-lib fork) behind `pdf-client` |
| Validation  | zod 4 (tool option schemas)                                     |
| Server PDF  | Python 3.12+, pikepdf (`services/pdfcore`)                      |
| Tests       | Vitest 5, Playwright, pytest                                    |

Pinned on purpose:

- **TypeScript 6.0.x, not 7**: typescript-eslint 8 supports TypeScript below 6.1 only.
- **ESLint 9, not 10**: the plugins inside eslint-config-next 16 support ESLint 9 at most.

Versions are exact (`savePrefix: ''`); shared ones live in the `catalog:` in `pnpm-workspace.yaml`.

## Commands

Run from the repo root. On Windows PowerShell use `pnpm.cmd` (the `.ps1` shim is blocked by the
execution policy) or Git Bash.

| Task                               | Command                               |
| ---------------------------------- | ------------------------------------- |
| Install                            | `pnpm install`                        |
| Web dev server (port 3000)         | `pnpm dev`                            |
| Typecheck, lint, unit tests, build | `pnpm check`                          |
| End-to-end tests (port 3100)       | `pnpm test:e2e`                       |
| Formatting                         | `pnpm format` / `pnpm format:check`   |
| License gate (npm)                 | `pnpm licenses:check`                 |
| One package only                   | `pnpm --filter @repo/pdf-client test` |

Python (`services/pdfcore`), using the venv's interpreter directly:

```bash
py -3.14 -m venv services/pdfcore/.venv                        # once
services/pdfcore/.venv/Scripts/python.exe -m pip install -e services/pdfcore --group services/pdfcore/pyproject.toml:dev
services/pdfcore/.venv/Scripts/python.exe -m pytest services/pdfcore
services/pdfcore/.venv/Scripts/python.exe -m ruff check services/pdfcore
```

On Linux and macOS replace `.venv/Scripts/python.exe` with `.venv/bin/python`.

Regenerate the test corpus only when adding fixtures (encrypted files change on every run):

```bash
services/pdfcore/.venv/Scripts/python.exe testdata/scripts/generate_corpus.py --arabic-font <NotoNaskhArabic-Regular.ttf>
```

## Folder map

```
apps/web/            Next.js site: tool pages, SEO, i18n (en at /, ar at /ar)
packages/config/     shared tsconfig bases, ESLint flat configs, Tailwind preset (dev only)
packages/pdf-client/ tool registry, errors, file sniffing, limits, naming, browser engine, worker
packages/ui/         React tool components (dropzone, file list, options, run, result) + UI strings
services/pdfcore/    Python package: server and sidecar PDF operations (pikepdf)
testdata/            PDF corpus (Git LFS) + manifest.json + generator script
e2e/                 Playwright tests
docs/                tool spec template and one spec per tool
scripts/             repo scripts (license gate)
```

Planned, **do not create early**: `services/api`, `services/worker`, `packages/api-client`,
`infra/` (phase 2); `apps/desktop` (phase 4).

## Architecture rules

- The **tool registry** (`packages/pdf-client/src/registry`) is the single source of truth. Routes,
  sitemap, home page and (later) the desktop menu and API validation come from it.
- `@repo/pdf-client` (root entry) is safe everywhere. `@repo/pdf-client/engine` (pdf-lib) runs only
  in the Web Worker or the runner's fallback; never import it from server components or `apps/web`.
  ESLint enforces this.
- Browser tools must never send file bytes over the network. The e2e test for each browser tool
  asserts there are no non-GET requests.
- Every page and layout under `app/[locale]` calls `setRequestLocale(locale)`.
- Every user-visible string goes into **both** `en.json` and `ar.json`. Page copy lives in
  `apps/web/messages`; component strings live in `packages/ui/src/messages`. A test checks parity.
- Use logical Tailwind classes only (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`,
  `text-end`, `border-s`, `rounded-s`). A lint rule rejects physical ones (`ml-`, `pr-`, `left-`,
  `text-left`, and so on).
- Render user-provided text (file names) inside `<bdi>`.
- Errors cross the worker boundary as `PdfClientError` codes. Python uses the same code strings.

## Add a tool

1. Write the spec at `docs/tools/<slug>.md` from `docs/tool-spec-template.md`.
2. Write failing tests first: Vitest (`packages/pdf-client/test`) and/or pytest
   (`services/pdfcore/tests`) on `testdata/`, plus a Playwright spec in `e2e/tests`.
3. Add the registry entry in `packages/pdf-client/src/registry/tools/<id>.ts` and list it in
   `registry/index.ts`.
4. Add page copy to `apps/web/messages/{en,ar}.json` under `tools.<id>`.
5. Add UI strings to `packages/ui/src/messages/{en,ar}.json` under `tools.<id>`.
6. Add the engine operation (`packages/pdf-client/src/engine/<id>.ts`) and register it in
   `engine/index.ts`, and/or the pdfcore op (`services/pdfcore/src/pdfcore/ops/<id>.py`).
7. Add `packages/ui/src/tools/<id>.tsx` and map it in `apps/web/src/components/ToolMount.tsx`.
8. Run `pnpm check`, `pnpm test:e2e`, `pnpm licenses:check` and pytest.

**Follow the Merge tool pattern** (`merge` in every folder above) unless the spec says otherwise.

## Tool spec template

```markdown
## Tool: <name> (slug: <slug>)

Runs: browser | server | both
Input: <file types, max count, max size>
Options: <name, type, default> per option
Output: <file type, naming rule>
Edge cases: encrypted input, 0-page file, 1,000+ pages, Arabic text
Acceptance:

- [ ] registry entry + EN and AR page copy
- [ ] pdf-client or pdfcore operation with unit tests on testdata/
- [ ] Playwright test: upload, run, download, verify
- [ ] no new dependency outside the license allow-list
```

## License policy

- Allowed in shipped code: MIT, MIT-0, ISC, 0BSD, BSD-2-Clause, BSD-3-Clause, Apache-2.0, MPL-2.0,
  CC0-1.0, Unlicense, BlueOak-1.0.0 (Python also: MIT-CMU, HPND).
- Named exceptions, each with a reason, live in `license-policy.json`. Adding one needs the
  owner's approval in the PR.
- Blocked: anything AGPL, GPL, SSPL or BUSL, in dev dependencies too. Never add PyMuPDF,
  Ghostscript, iText or pdf2docx (AGPL or built on it).
- CI runs `pnpm licenses:check` (npm) and `pip-licenses --allow-only` (Python).

## Don'ts

- Never edit `packages/api-client` by hand (it will be generated from the FastAPI OpenAPI spec).
- No binary files outside Git LFS (`testdata/**` is tracked by LFS through `.gitattributes`).
- No new dependency without checking its license.
- Do not resolve open decisions in code: product name, domain, payment route, code signing.
- Do not set `NEXT_PUBLIC_INDEXABLE` anywhere except the production launch environment.

## Workflow

- One tool per task and pull request: spec, then tests, then code.
- CI must pass typecheck, lint, unit, end-to-end, Python and license checks before merge.

## Windows notes

- `pnpm` in PowerShell resolves to a blocked `.ps1`; use `pnpm.cmd` or Git Bash.
- In Windows PowerShell 5.1, `curl` is `Invoke-WebRequest`; use `curl.exe`.
- Stop `next dev` before `next build`, or `.next` fails with EPERM.
- Line endings are LF everywhere (`.gitattributes`), whatever `core.autocrlf` says.
