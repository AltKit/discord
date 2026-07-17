# API reference

This catalog is generated from the JSDoc in `src/` by `@discordjs/docgen`. It contains every documented class, function, interface, typedef, and external in the current source tree.

::: info Generated documentation
Run `npm run docs` after changing public JSDoc, then commit the resulting `docs/main.json`. The VitePress API routes are produced from that file at build time—there are no generated Markdown pages to maintain.
:::

## Browse symbols

<ApiCatalog />

## How to read a page

- **Classes** document constructors, properties, methods, and emitted events.
- **Interfaces** group behavior mixed into multiple concrete structures.
- **Typedefs** describe option objects, callbacks, payloads, and unions.
- **Functions** document standalone helpers.
- **Externals** name types supplied by Discord API packages, Node.js, or other dependencies.

Private and deprecated members remain visible when they are present in source documentation, and are labeled accordingly. Prefer public, non-deprecated APIs for new code.

## Most-used entry points

- [Client](/api/classes/client) — gateway, managers, login, lifecycle, and account helpers
- [ClientOptions](/api/typedefs/clientoptions) — cache, partial, REST, gateway, presence, captcha, and TOTP options
- [TextBasedChannel](/api/interfaces/textbasedchannel) — send, collectors, webhooks, and application-command helpers
- [Message](/api/classes/message) — message data and mutation methods
- [Guild](/api/classes/guild) — guild data, managers, and account actions
- [User](/api/classes/user) — user identity and DM helpers
- [Events](/api/events) — modern event constants
- [Exports and aliases](/api/exports) — package-root compatibility map
