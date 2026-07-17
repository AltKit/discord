'use strict';

const Interaction = require('./Interaction');
const InteractionWebhook = require('./InteractionWebhook');
const ModalSubmitFieldsResolver = require('./ModalSubmitFieldsResolver');
const InteractionResponses = require('./interfaces/InteractionResponses');
const { MessageComponentTypes } = require('../util/Constants');

/**
 * Represents a modal submit interaction.
 * @extends {Interaction}
 * @implements {InteractionResponses}
 */
class ModalSubmitInteraction extends Interaction {
  constructor(client, data) {
    super(client, data);

    /**
     * The custom id of the modal.
     * @type {string}
     */
    this.customId = data.data.custom_id;

    /**
     * @typedef {Object} PartialTextInputData
     * @property {string} [customId] A unique string to be sent in the interaction when submitted
     * @property {MessageComponentType} [type] The type of this component
     * @property {string} [value] Value of this text input component
     */

    /**
     * @typedef {Object} PartialModalActionRow
     * @property {MessageComponentType} [type] The type of this component
     * @property {PartialTextInputData[]} [components] Partial text input components
     */

    /**
     * The inputs within the modal
     * @type {PartialModalActionRow[]}
     */
    this.components = data.data.components?.map(c => ModalSubmitInteraction.transformComponent(c)) ?? [];

    /**
     * The message associated with this interaction
     * @type {Message|APIMessage|null}
     */
    this.message = data.message ? this.channel?.messages._add(data.message) ?? data.message : null;

    /**
     * The fields within the modal
     * @type {ModalSubmitFieldsResolver}
     */
    this.fields = new ModalSubmitFieldsResolver(this.components);

    /**
     * Whether the reply to this interaction has been deferred
     * @type {boolean}
     */
    this.deferred = false;

    /**
     * Whether the reply to this interaction is ephemeral
     * @type {?boolean}
     */
    this.ephemeral = null;

    /**
     * Whether this interaction has already been replied to
     * @type {boolean}
     */
    this.replied = false;

    /**
     * An associated interaction webhook, can be used to further interact with this interaction
     * @type {InteractionWebhook}
     */
    this.webhook = new InteractionWebhook(this.client, this.applicationId, this.token);
  }

  /**
   * Transforms component data to discord.js-compatible data
   * @param {*} rawComponent The data to transform
   * @returns {PartialTextInputData[]}
   */
  static transformComponent(rawComponent) {
    const component = {
      id: rawComponent.id,
      type: MessageComponentTypes[rawComponent.type],
    };

    if (Array.isArray(rawComponent.components)) {
      component.components = rawComponent.components.map(c => this.transformComponent(c));
    } else if (rawComponent.component) {
      component.component = this.transformComponent(rawComponent.component);
    } else {
      component.customId = rawComponent.custom_id;
      if ('value' in rawComponent) component.value = rawComponent.value;
      if ('values' in rawComponent) component.values = rawComponent.values;
    }

    return component;
  }

  /**
   * Whether this is from a {@link MessageComponentInteraction}.
   * @returns {boolean}
   */
  isFromMessage() {
    return Boolean(this.message);
  }

  // These are here only for documentation purposes - they are implemented by InteractionResponses
  /* eslint-disable no-empty-function */
  deferReply() {}
  reply() {}
  fetchReply() {}
  editReply() {}
  deleteReply() {}
  followUp() {}
  update() {}
  deferUpdate() {}
}

InteractionResponses.applyToClass(ModalSubmitInteraction, ['showModal', 'awaitModalSubmit']);

module.exports = ModalSubmitInteraction;
