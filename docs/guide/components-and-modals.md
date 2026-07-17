# Components and modals

Components add buttons, select menus, text inputs, labels, files, media, and layout to messages or modal dialogs. Altkit v4 supports the modern component shapes introduced around the Discord.js 14.27 compatibility target.

## Message and modal components

The two contexts overlap but are not interchangeable:

| Context | Typical components |
| --- | --- |
| Message | Buttons, select menus, action rows, sections, text displays, thumbnails, media galleries, files, separators, and containers |
| Modal | Text inputs, file uploads, radio groups, checkbox groups, individual checkboxes, labels, and action rows |

Use builders re-exported from `@discordjs/builders` when available. Fork structures represent components received from Discord and provide compatibility serialization.

## Buttons

```js
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('@altkit/discord');

const row = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId('docs:confirm')
    .setLabel('Confirm')
    .setStyle(ButtonStyle.Primary),
);

await channel.send({
  content: 'Continue?',
  components: [row],
});
```

Make `customId` values namespaced and stable. They are routing data, not authorization—validate the acting user separately.

## Handle component interactions

```js
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== 'docs:confirm') return;
  if (interaction.user.id !== client.user.id) return;

  await interaction.update({
    content: 'Confirmed',
    components: [],
  });
});
```

Choose one acknowledgement method appropriate to the interaction: reply, update, defer reply, or defer update. Discord only permits a limited acknowledgement window.

## Modals

A modal has a custom ID, title, and nested input components. Modal structures returned from fork-specific command invocation can be populated and submitted:

```js
const response = await channel.sendSlash(process.env.APPLICATION_ID, 'profile edit');

if (!response.isMessage) {
  response.components[0].components[0].setValue('New profile value');
  await response.reply();
}
```

Inspect the actual tree before indexing into it. Modern inputs may be wrapped by a `LabelComponent`, and the nested shape can differ from older action-row-only modals.

## Read modal submissions

`ModalSubmitFieldsResolver` indexes submitted inputs by custom ID. Modern getters include:

| Method | Result |
| --- | --- |
| `getTextInputValue(customId)` | Text value |
| `getStringSelectValues(customId)` | Selected string values |
| `getFileUploadValues(customId)` | Uploaded attachment IDs |
| `getRadioGroupValue(customId)` | Selected radio value or `null` |
| `getCheckboxGroupValues(customId)` | Selected checkbox-group values |
| `getCheckboxValue(customId)` | Boolean checkbox state |

```js
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isModalSubmit()) return;
  if (interaction.customId !== 'profile:edit') return;

  const displayName = interaction.fields.getTextInputValue('display-name');
  await interaction.reply({ content: `Received ${displayName}` });
});
```

## Validation and state

- Treat all submitted values and files as untrusted input.
- Check length, format, IDs, and allowed choices server-side.
- Include a workflow identifier in custom IDs when multiple views can coexist.
- Reject stale components after their underlying state changes.
- Remove or disable one-time controls after use.
- Avoid putting credentials or private data directly in custom IDs.

## Component limits

Discord enforces limits on nesting, component counts, labels, option counts, text lengths, and file payloads. Builders catch some invalid shapes locally, while Discord remains authoritative for the final payload.

## Useful API pages

- [BaseMessageComponent](/api/classes/basemessagecomponent)
- [MessageActionRow](/api/classes/messageactionrow)
- [Modal](/api/classes/modal)
- [ModalSubmitInteraction](/api/classes/modalsubmitinteraction)
- [ModalSubmitFieldsResolver](/api/classes/modalsubmitfieldsresolver)
- [LabelComponent](/api/classes/labelcomponent)
- [ModalInputComponent](/api/classes/modalinputcomponent)
