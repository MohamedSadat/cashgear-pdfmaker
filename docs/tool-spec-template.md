# Tool spec template

Copy this into `docs/tools/<slug>.md` before writing any code for a new tool.

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
