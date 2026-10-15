// License gate for npm dependencies (see license-policy.json and AGENTS.md).
//
// 1. Production dependencies of the shipped packages must use an allowed license, or match a
//    named exception.
// 2. Every dependency in the workspace, dev tools included, must avoid the denied licenses.
//
// Run: pnpm licenses:check
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const policy = JSON.parse(readFileSync(new URL('../license-policy.json', import.meta.url), 'utf8'));

// `pnpm licenses:check` sets npm_execpath to the pnpm binary that is running this script.
const pnpm = process.env.npm_execpath;
if (!pnpm) {
  console.error('Run this through pnpm: pnpm licenses:check');
  process.exit(2);
}

// pnpm may be a native binary or a JS entry point, depending on how it was installed.
const [command, prefix] = /\.[cm]?js$/.test(pnpm) ? [process.execPath, [pnpm]] : [pnpm, []];

function listLicenses(args) {
  const out = execFileSync(command, [...prefix, ...args, 'licenses', 'list', '--json'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const byLicense = JSON.parse(out);
  return Object.entries(byLicense).flatMap(([license, packages]) =>
    packages.map((p) => ({
      name: p.name,
      versions: p.versions ?? [],
      license: p.license ?? license,
    })),
  );
}

/** SPDX ids in an expression, plus whether it is an OR (any term may be chosen). */
function parseExpression(expression) {
  const cleaned = String(expression).replace(/[()]/g, ' ').trim();
  const isOr = /\sOR\s/.test(cleaned) && !/\sAND\s/.test(cleaned);
  const ids = cleaned
    .split(/\s+(?:AND|OR|WITH)\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return { ids, isOr };
}

function exceptionFor(pkg, id) {
  return policy.exceptions.find(
    (e) =>
      e.license === id &&
      (e.package === pkg.name || (e.packagePrefix && pkg.name.startsWith(e.packagePrefix))),
  );
}

function isAllowed(pkg) {
  const { ids, isOr } = parseExpression(pkg.license);
  if (ids.length === 0) return false;
  const ok = (id) => policy.allow.includes(id) || Boolean(exceptionFor(pkg, id));
  return isOr ? ids.some(ok) : ids.every(ok);
}

function isDenied(pkg) {
  const { ids, isOr } = parseExpression(pkg.license);
  const denied = (id) => policy.deny.some((prefix) => id.startsWith(prefix));
  return isOr ? ids.every(denied) : ids.some(denied);
}

const label = (p) => `${p.name}@${p.versions.join(',')} (${p.license})`;
const problems = [];

const filters = policy.shippedPackages.flatMap((name) => ['--filter', name]);
const shipped = listLicenses([...filters, '--prod']);
for (const name of policy.mustInclude) {
  if (!shipped.some((p) => p.name === name)) {
    problems.push(
      `sanity check: ${name} missing from the production report; pnpm is not walking workspace dependencies`,
    );
  }
}
for (const pkg of shipped) {
  if (!isAllowed(pkg)) problems.push(`not allowed in shipped code: ${label(pkg)}`);
}

const everything = listLicenses(['--recursive']);
for (const pkg of everything) {
  if (isDenied(pkg)) problems.push(`denied license (dev or prod): ${label(pkg)}`);
}

if (problems.length > 0) {
  console.error(`License check failed:\n  ${problems.join('\n  ')}`);
  console.error('Fix the dependency, or add a reasoned exception to license-policy.json.');
  process.exit(1);
}
console.log(
  `License check passed: ${shipped.length} production packages allowed, ${everything.length} total free of denied licenses.`,
);
