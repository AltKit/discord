'use strict';

const { execFileSync } = require('node:child_process');
const { readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { dirname, join } = require('node:path');

const committedPath = join(__dirname, '..', 'docs', 'main.json');
const generatedPath = join(tmpdir(), `altkit-docs-${process.pid}.json`);
const docgenPath = join(dirname(require.resolve('@discordjs/docgen/package.json')), 'dist', 'cli.cjs');

try {
  execFileSync(
    process.execPath,
    [docgenPath, '--input', 'src/**/*.js', '--custom', 'docs/index.json', '--output', generatedPath],
    { cwd: join(__dirname, '..'), stdio: 'inherit' },
  );

  const committed = JSON.parse(readFileSync(committedPath, 'utf8'));
  const generated = JSON.parse(readFileSync(generatedPath, 'utf8'));

  delete committed.meta.date;
  delete generated.meta.date;

  if (JSON.stringify(committed) !== JSON.stringify(generated)) {
    console.error('Generated documentation is out of date. Run `npm run docs` and commit docs/main.json.');
    process.exitCode = 1;
  }
} finally {
  rmSync(generatedPath, { force: true });
}
