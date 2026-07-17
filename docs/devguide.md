# Altkit Discord preservation and redistribution guide

This guide explains how maintainers can keep Altkit Discord recoverable, continue its development, and redistribute original or
modified versions under the project's GNU General Public License version 3 (GPLv3). It is practical project guidance, not
legal advice. If a release has unusual packaging, bundled proprietary components, or commercial distribution terms, obtain
legal advice before publishing it.

The complete and controlling license text is in [`LICENSE`](../LICENSE). The
[GPLv3 text](https://www.gnu.org/licenses/gpl-3.0.html),
[GNU licensing guide](https://www.gnu.org/licenses/gpl-howto.html), and
[GNU GPL FAQ](https://www.gnu.org/licenses/gpl-faq.html) provide additional explanations.

## Preserve the project

Preservation means keeping enough material for another maintainer to inspect, build, test, release, and continue the project
without relying on one account or workstation.

### Keep complete, independent copies

Maintain at least two copies under different administrative control. A normal clone is suitable for development; a mirror or
bundle also preserves all branches, tags, and Git history.

```sh
git clone https://github.com/altkit/discord.git
git clone --mirror https://github.com/altkit/discord.git altkit-discord.git
git -C altkit-discord.git bundle create ../altkit-discord.bundle --all
git bundle verify ../altkit-discord.bundle
```

Refresh a mirror with `git fetch --prune` and periodically test restoration into an empty directory. Store release artifacts,
source archives, checksums, and documentation with the repository backup. Never archive `.env`, account tokens, TOTP secrets,
proxy credentials, npm credentials, signing keys, or CI secrets.

### Preserve the release inputs

Keep these files current and versioned:

- `package.json` and `package-lock.json`, including the supported Node.js version and dependency versions;
- runtime source in `src/` and declarations in `typings/`;
- tests, examples, documentation, and CI/release workflows;
- `README.md`, `LICENSE`, copyright notices, credits, and the repository history;
- migration notes and any scripts required to build, test, package, or install a release.

Before accepting a runtime change, update its declarations, tests, documentation, and examples where applicable. Run the same
checks used by CI:

```sh
npm ci
npm test
npm pack --dry-run
```

Inspect the dry-run file list. In particular, confirm that `package.json`, `README.md`, and `LICENSE` are present and that no
credentials, local data, logs, or unrelated files are included.

### Avoid a single-maintainer failure

Give more than one trusted maintainer access to the source host and package registry. Protect release tags, require CI before
merging, document how npm provenance and release automation work, and keep account-recovery information outside the repository.
Periodically verify that a clean checkout on every supported Node.js version can install dependencies and pass the test suite.

## Understand when GPLv3 obligations apply

You may run and modify Altkit Discord privately without publishing those changes. GPLv3 redistribution requirements apply when you
give, sell, upload, publish, or otherwise convey copies to someone else. Running a modified copy only as a network service is
not, by itself, conveying it under GPLv3.

The recipient must receive the GPL freedoms. A distributor may charge for copies or support, but may not add terms that prevent
recipients from using, studying, modifying, or redistributing the covered work as GPLv3 permits.

## Redistribute an unmodified source copy

When redistributing the source without changes:

1. Include the complete source being distributed.
2. Keep all copyright, license, attribution, and warranty notices intact.
3. Include the complete `LICENSE` file with the copy.
4. Do not impose further restrictions that contradict GPLv3.
5. Keep third-party license and notice files for dependencies or copied material. Those components remain subject to their own
   compatible licenses.

A public Git mirror is acceptable, but make it clear that it is unofficial and identify the upstream project. Do not imply
endorsement by Altkit Discord, Discord.js, or Discord.

## Redistribute a modified source copy

You may fork and modify Altkit Discord. When conveying the modified source, also:

1. Add prominent notices saying that you changed the work and give a relevant change date.
2. License the covered work as a whole under GPLv3 and state that clearly.
3. Provide the preferred form for making further changes, not only generated files, minified code, patches, or diffs.
4. Preserve existing copyright and attribution notices. Add your own notice for copyrightable changes; do not replace earlier
   authors' notices with your own.
5. Include build, test, packaging, and installation scripts needed to create and run the distributed form.
6. Document any additional permissions or permitted section 7 terms separately and precisely. Do not silently edit the GPL text.

A useful change notice is:

```text
Modified by <name or organization> on <YYYY-MM-DD>.
Summary: <brief description of the changes>.
This modified version is distributed under GNU GPL version 3.
```

Put the notice where recipients will see it, such as a `CHANGES.md`, release notes, and the headers of substantially modified
files. Git history is useful evidence, but it should not be the only prominent record of changes in a distributed archive.

## Redistribute packages, bundles, or other non-source forms

The safest release pattern is to make the exact Corresponding Source available beside every non-source artifact, at no extra
charge, for as long as the artifact is offered. Link the artifact to source for the same version and commit—not a moving default
branch, an older release, or a later release.

Corresponding Source generally includes the source used to produce the artifact plus the scripts and interface definitions
needed to build, install, run, and modify it. It does not normally include unmodified system libraries or general-purpose tools
that are not part of the work. Source for your modified version cannot be replaced with upstream source plus a patch set.

GPLv3 section 6 permits other methods, including certain written offers and peer-to-peer distribution, but their conditions are
specific. Unless a different method has been reviewed carefully, distribute the source and artifact together or provide
equivalent network access with clear source-download instructions.

If an object-code release is installed in a GPLv3 “User Product” and the distributor retains the ability to install modified
versions, GPLv3 may also require the installation information, authorization material, or methods recipients need to install and
run their modified object code. Do not use signing or access controls to make the granted modification right ineffective.

## Release procedure

Use this checklist for every redistributed release:

- [ ] Select an immutable version and commit, and record both in the release notes.
- [ ] Review every dependency, copied asset, and new source file for compatible terms and preserved notices.
- [ ] Record modifications and their dates; update credits without removing earlier attribution.
- [ ] Confirm that the release is stated to be under GPLv3 and includes the unmodified full license text.
- [ ] Build from a clean checkout with `npm ci` and run `npm test`.
- [ ] Run `npm pack --dry-run`, inspect the contents, and test the resulting package in a clean project.
- [ ] Remove credentials, private test data, logs, caches, and local configuration.
- [ ] Publish the exact Corresponding Source and build/install material with every non-source artifact.
- [ ] Add a stable source link and retrieval instructions to the release or download page.
- [ ] Create checksums for source and package archives and preserve copies in a second location.
- [ ] Keep source access available for as long as the corresponding network artifact is distributed.

For this repository, a tagged release should pass CI before the existing release workflow publishes it to npm. The package
version and tag version must match. A maintainer should then verify the npm provenance record, install the published package in a
clean project, and confirm that the tag, source archive, package, license, and release notes all describe the same version.

## Credits and downstream communication

Altkit Discord is based on Discord.js and continues the original discord.js-selfbot-v13 work. Preserve the credits in `README.md`,
the notices in `LICENSE`, and notices embedded in individual files or dependencies. Downstream documentation should repeat the
project's safety warning: automating a normal Discord user account violates Discord's Terms of Service and may result in account
termination. Never include instructions that encourage users to expose or extract account credentials.

When in doubt, distribute more source and clearer notices, keep artifacts tied to immutable versions, and ask a qualified lawyer
to review any condition not answered by GPLv3 itself.
