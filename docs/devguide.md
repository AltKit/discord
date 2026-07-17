# Altkit Discord developer and release guide

This guide covers local development, GitHub Actions, npm publishing, project
preservation, and GPLv3 redistribution for Altkit Discord.

> [!CAUTION]
> Automating a normal Discord user account violates Discord's Terms of Service
> and may result in account termination. Never commit or publish Discord tokens,
> TOTP secrets, proxy credentials, npm credentials, or other account secrets.

> [!NOTE]
> The licensing sections are practical project guidance, not legal advice. The
> complete and controlling license text is in [`LICENSE`](../LICENSE).

## Contents

- [Development setup](#development-setup)
- [Project commands](#project-commands)
- [Making a change](#making-a-change)
- [GitHub Actions](#github-actions)
- [Building the npm package](#building-the-npm-package)
- [Publishing to npm](#publishing-to-npm)
- [Release checklist](#release-checklist)
- [Preserving the project](#preserving-the-project)
- [GPLv3 redistribution](#gplv3-redistribution)

## Development setup

### Requirements

| Tool | Requirement | Purpose |
| --- | --- | --- |
| Node.js | 20.18 or newer | Runtime and test environment |
| npm | Included with Node.js | Dependency and package management |
| Git | Current supported version | Source control and release tags |

CI tests the project on Node.js 20.18, 22, and 24. Node.js 22 is the release
runtime, so maintainers should test with it before publishing.

### Clone and install

```sh
git clone https://github.com/altkit/discord.git
cd discord
npm ci
npm test
```

Use `npm ci` when reproducing CI or preparing a release. It installs the exact
versions in `package-lock.json` and fails if the lockfile disagrees with
`package.json`. Use `npm install` when intentionally changing dependencies, and
commit the resulting `package.json` and `package-lock.json` changes together.

### Run an example

Copy the environment template and populate only the values required by the
example:

```sh
cp .env.example .env
node --env-file=.env examples/Basic.js
```

The `.env` file is ignored by Git and must remain local. See
[`examples/README.md`](../examples/README.md) for the example requirement matrix
and any additional media or native dependencies.

## Project commands

| Command | What it does |
| --- | --- |
| `npm test` | Runs all lint, docs, TypeScript, example syntax, unit, and smoke checks |
| `npm run lint:all` | Checks JavaScript and TypeScript declarations |
| `npm run test:typescript` | Runs `tsc --noEmit` and `tsd` declaration tests |
| `npm run test:examples` | Syntax-checks every JavaScript example |
| `npm run test:unit` | Runs the Node.js unit tests |
| `npm run test:smoke` | Verifies that the package entry point loads |
| `npm run docs` | Regenerates `docs/main.json` |
| `npm run fix:all` | Applies lint and formatting fixes |
| `npm run build` | Applies fixes, formats source, and regenerates API docs |
| `npm pack --dry-run` | Shows the files and metadata that npm would publish |

> [!IMPORTANT]
> `npm run build` modifies tracked files because it applies automatic fixes and
> regenerates documentation. Review `git diff` after running it. The package
> uses `src/` directly and does not transpile to a separate output directory.

The `npm run all` script builds and immediately runs `npm publish`. It is best
reserved for an intentional manual release; do not use it as a routine local
verification command.

## Making a change

1. Create a focused branch from the current default branch.
2. Update runtime code in `src/`.
3. Update `typings/`, tests, docs, and examples when the public API or behavior
   changes.
4. Run the formatter/fixers, then the complete test suite.
5. Inspect the package archive before opening a pull request.

```sh
git switch -c fix/short-description
npm run fix:all
npm test
npm pack --dry-run
git diff --check
git status --short
```

Do not commit generated package archives (`*.tgz`), `.env`, credentials, logs,
or local test data.

## GitHub Actions

The workflows live in [`.github/workflows/`](../.github/workflows/).

### CI workflow

[`ci.yml`](../.github/workflows/ci.yml) runs:

- on every branch push;
- on every pull request; and
- when manually started with **Actions → CI → Run workflow**.

The test job runs `npm ci` and `npm test` on Node.js 20.18, 22, and 24. The
Node.js 22 job also regenerates `docs/main.json` and fails if the committed API
documentation is stale. A separate package job runs `npm pack --dry-run`.

To enable CI in a new fork:

1. Push the repository, including `.github/workflows/ci.yml`, to GitHub.
2. Open the repository's **Actions** tab and enable workflows if GitHub prompts
   you to do so.
3. In **Settings → Actions → General**, allow the actions used by this project.
   The workflow requires `actions/checkout@v4` and `actions/setup-node@v4`.
4. Keep the default `GITHUB_TOKEN` workflow permission at **Read repository
   contents**. CI does not require write access or repository secrets.
5. Run the workflow manually once, or push a branch and open a pull request.

For branch protection or a ruleset, require the successful CI checks before a
pull request can merge. Select the checks after they have run at least once so
GitHub can list their exact names.

#### Reproduce CI locally

Use a clean Node.js 22 checkout for the closest single-version reproduction:

```sh
npm ci
npm test
npm run docs
git diff --exit-code -- docs/main.json
npm pack --dry-run
```

The workflow preserves the generated documentation timestamp before comparing
the file. A local `npm run docs` may therefore show only a date change; inspect
the diff rather than committing a timestamp-only update.

### Release workflow

[`release.yml`](../.github/workflows/release.yml) publishes when a tag matching
`v4.*.*` or `4.*.*` is pushed. It:

1. checks out the tagged commit;
2. installs Node.js 22 and dependencies;
3. verifies that the tag and `package.json` version match;
4. runs the complete test suite; and
5. publishes `@altkit/discord` publicly with npm provenance.

The job uses a GitHub environment named `npm`, needs `contents: read` and
`id-token: write`, and currently authenticates with the `NPM_TOKEN` environment
secret.

#### Configure npm publishing

The npm account or organization must have publish access to
`@altkit/discord`. Then configure GitHub:

1. On npm, create an automation-capable granular access token with read/write
   package permission for `@altkit/discord`.
2. In GitHub, open **Settings → Environments → New environment** and create an
   environment named `npm`.
3. Add an environment secret named `NPM_TOKEN` containing the npm token.
4. Optionally add required reviewers or tag deployment rules to the `npm`
   environment. Ensure the chosen rules still allow the release tags.
5. In **Settings → Actions → General**, make sure workflow permissions can issue
   an OpenID Connect identity token. The workflow's `id-token: write`
   permission is required for provenance; it does not grant source write access.

> [!TIP]
> Prefer a granular npm token scoped to the single package. Never store an npm
> token in `.npmrc`, `.env`, a workflow file, a release artifact, or a repository
> secret when the job reads it from the protected `npm` environment.

If the package is configured for npm trusted publishing, the workflow can be
migrated to tokenless publishing. Configure the GitHub repository and
`release.yml` filename as a trusted publisher on npm, keep `id-token: write`,
then remove `NODE_AUTH_TOKEN` only after verifying the trusted-publisher setup.
Until that migration is complete, the checked-in workflow requires `NPM_TOKEN`.

#### Common workflow failures

| Failure | Likely cause | Resolution |
| --- | --- | --- |
| `npm ci` reports lockfile mismatch | `package.json` changed without updating the lockfile | Run `npm install`, review, and commit `package-lock.json` |
| Lint or formatting fails | Source does not match project rules | Run `npm run fix:all`, then `npm test` |
| Documentation check has a diff | `docs/main.json` is stale | Run `npm run docs`, review the meaningful changes, and commit them |
| Tag/version verification fails | Git tag and package version differ | Recreate the release with matching versions; do not publish mismatched source |
| `ENEEDAUTH` or HTTP 401 | `NPM_TOKEN` is missing, expired, or inaccessible to the environment | Replace the `npm` environment secret and verify environment rules |
| HTTP 403 during publish | Token lacks package access, 2FA policy blocks it, or the version already exists | Check npm package permissions and choose a new version if already published |
| Provenance generation fails | `id-token: write` is missing or the publish is not running in supported GitHub Actions | Restore the permission and publish only from the release workflow |
| Workflow does not start | Actions are disabled, tag pattern does not match, or workflow is absent from the tagged commit | Enable Actions and inspect the pushed tag with `git show <tag>:.github/workflows/release.yml` |

## Building the npm package

This repository publishes JavaScript from `src/` and declarations from
`typings/`; there is no transpiled `dist/` directory. The `files` allowlist in
`package.json` restricts the package payload, while npm also includes package
metadata and standard documentation/license files.

Prepare and inspect a local archive:

```sh
npm ci
npm run build
npm test
npm pack --dry-run
npm pack
```

`npm pack` creates a file such as `altkit-discord-4.0.0.tgz`. Inspect its exact
contents:

```sh
tar -tzf altkit-discord-4.0.0.tgz
```

Test that archive in a temporary project before publishing:

```sh
mkdir /tmp/altkit-package-test
cd /tmp/altkit-package-test
npm init -y
npm install /path/to/altkit-discord-4.0.0.tgz
node -e "console.log(require('@altkit/discord').version)"
```

Confirm that the archive contains `src/`, `typings/`, `package.json`, `README.md`,
and `LICENSE`, and does not contain secrets, local data, tests, caches, or
unrelated files.

## Publishing to npm

### Recommended: publish with GitHub Actions

Update the version without creating a tag automatically:

```sh
npm version 4.0.1 --no-git-tag-version
npm install
npm run build
npm test
npm pack --dry-run
```

Replace `4.0.1` with the intended semantic version. Review and commit the
version, lockfile, generated docs, and release notes. After that commit has
passed CI, create and push a matching release tag:

```sh
git tag -a v4.0.1 -m "Release v4.0.1"
git push origin v4.0.1
```

Pushing the tag starts the release workflow. Monitor it under **GitHub → Actions
→ Release**, then verify the published package:

```sh
npm view @altkit/discord@4.0.1 version dist.integrity
npm install @altkit/discord@4.0.1
```

Also verify the provenance entry on npm and create GitHub release notes for the
same immutable tag.

> [!WARNING]
> npm versions are immutable. If a release is wrong, publish a corrected new
> version. Do not move a published release tag to different source.

### Manual fallback

Use manual publishing only when release automation is unavailable and the
maintainer is authorized to publish the package:

```sh
npm login
npm whoami
npm ci
npm test
npm pack --dry-run
npm publish --access public
```

Run `npm publish` from a clean checkout of the release commit. A local manual
publish does not provide the same GitHub Actions provenance path as the release
workflow, so document why the fallback was used.

## Release checklist

- [ ] Choose a semantic version and update both `package.json` and
  `package-lock.json`.
- [ ] Record user-visible changes and any required migration steps.
- [ ] Confirm runtime code, declarations, tests, docs, and examples agree.
- [ ] Run `npm ci`, `npm run build`, `npm test`, and `npm pack --dry-run`.
- [ ] Review `git diff`, package contents, dependency licenses, and security
  notices.
- [ ] Test the packed archive in a clean temporary project.
- [ ] Confirm the exact release commit has passed every required CI check.
- [ ] Create a tag whose version exactly matches `package.json`.
- [ ] Monitor the release workflow and its protected `npm` environment.
- [ ] Verify npm version, integrity, provenance, installability, and package
  contents.
- [ ] Publish GitHub release notes and link the immutable source tag.
- [ ] Preserve the source archive, package archive, checksums, and release notes.

## Preserving the project

Preservation means keeping enough material for another maintainer to inspect,
build, test, release, and continue the project without relying on one account or
workstation.

### Keep independent copies

Maintain at least two copies under different administrative control. A normal
clone is suitable for development; a mirror or bundle preserves all refs and
Git history.

```sh
git clone https://github.com/altkit/discord.git
git clone --mirror https://github.com/altkit/discord.git altkit-discord.git
git -C altkit-discord.git bundle create ../altkit-discord.bundle --all
git bundle verify ../altkit-discord.bundle
```

Refresh a mirror with `git fetch --prune` and periodically restore it into an
empty directory. Store release artifacts, source archives, checksums, and docs
with the backup. Never archive live credentials or recovery codes.

### Preserve release inputs

Keep the following current and versioned:

- `package.json` and `package-lock.json`;
- runtime source in `src/` and declarations in `typings/`;
- tests, examples, docs, and CI/release workflows;
- `README.md`, `LICENSE`, copyright notices, credits, and Git history; and
- migration notes and all scripts needed to build, test, package, and install a
  release.

Give more than one trusted maintainer appropriate access to GitHub and npm.
Protect release tags, require CI before merging, document account recovery
outside the repository, and periodically test a clean build on every supported
Node.js version.

## GPLv3 redistribution

You may run and modify Altkit Discord privately without publishing those
changes. GPLv3 redistribution requirements apply when you give, sell, upload,
publish, or otherwise convey copies to someone else. Running a modified copy
only as a network service is not, by itself, conveying it under GPLv3.

Useful references:

- [GNU GPLv3 license text](https://www.gnu.org/licenses/gpl-3.0.html)
- [GNU licensing guide](https://www.gnu.org/licenses/gpl-howto.html)
- [GNU GPL FAQ](https://www.gnu.org/licenses/gpl-faq.html)

### Unmodified source copies

When redistributing unmodified source:

1. Include the complete source being distributed.
2. Keep copyright, license, attribution, and warranty notices intact.
3. Include the complete `LICENSE` file.
4. Do not impose further restrictions that contradict GPLv3.
5. Preserve third-party license and notice files. Third-party components remain
   subject to their own compatible licenses.

A public mirror should be identified as unofficial and should name the upstream
project. Do not imply endorsement by Altkit Discord, Discord.js, or Discord.

### Modified source copies

When conveying modified source:

1. Add prominent notices describing who changed the work and when.
2. License the covered work as a whole under GPLv3.
3. Provide the preferred form for making further changes—not only generated
   files, minified code, patches, or diffs.
4. Preserve existing copyright and attribution notices, adding your own notice
   without replacing earlier authors' notices.
5. Include the scripts and interface definitions needed to build, test, install,
   run, and modify the distributed form.
6. Document any additional permissions or permitted GPLv3 section 7 terms
   separately. Do not silently edit the GPL text.

Example change notice:

```text
Modified by <name or organization> on <YYYY-MM-DD>.
Summary: <brief description of the changes>.
This modified version is distributed under GNU GPL version 3.
```

Place the notice somewhere recipients will see it, such as `CHANGES.md`, release
notes, and headers of substantially modified files. Git history is useful
evidence, but should not be the only prominent record of changes.

### Packages and other non-source forms

The safest release pattern is to make the exact Corresponding Source available
beside every non-source artifact, at no extra charge, for as long as the artifact
is offered. Link each artifact to source for the same version and commit—not a
moving default branch or a different release.

Corresponding Source generally includes the source used to produce the artifact
plus the scripts and interface definitions needed to build, install, run, and
modify it. Source for a modified version cannot be replaced by upstream source
plus a patch set.

GPLv3 section 6 permits other distribution methods, but their conditions are
specific. If object code is installed in a GPLv3 “User Product” and the
distributor retains the ability to install modified versions, installation
information may also be required. Obtain qualified legal advice for unusual
packaging, hardware, proprietary components, or commercial distribution terms.

### Credits and downstream communication

Altkit Discord is based on Discord.js and continues the original
discord.js-selfbot-v13 work. Preserve the credits in [`README.md`](../README.md),
the notices in [`LICENSE`](../LICENSE), and notices embedded in individual files
or dependencies.

Downstream docs should repeat the project's safety warning: automating a normal
Discord user account violates Discord's Terms of Service and may result in
account termination. Never include instructions that encourage users to expose
or extract account credentials.
