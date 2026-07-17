'use strict';

const { TypeError } = require('../errors');
const { MessageComponentTypes } = require('../util/Constants');

/**
 * A resolver for modal submit interaction text inputs.
 */
class ModalSubmitFieldsResolver {
  constructor(components) {
    /**
     * The components within the modal
     * @type {PartialModalActionRow[]} The components in the modal
     */
    this.components = components;
  }

  /**
   * The extracted fields from the modal
   * @type {PartialInputTextData[]} The fields in the modal
   * @private
   */
  get _fields() {
    const fields = [];
    const visit = component => {
      if (Array.isArray(component.components)) component.components.forEach(visit);
      else if (component.component) visit(component.component);
      else if (component.customId) fields.push(component);
    };
    this.components.forEach(visit);
    return fields;
  }

  /**
   * Gets a field given a custom id from a component
   * @param {string} customId The custom id of the component
   * @returns {?PartialInputTextData}
   */
  getField(customId) {
    const field = this._fields.find(f => f.customId === customId);
    if (!field) throw new TypeError('MODAL_SUBMIT_INTERACTION_FIELD_NOT_FOUND', customId);
    return field;
  }

  /**
   * Gets the value of a text input component given a custom id
   * @param {string} customId The custom id of the text input component
   * @returns {?string}
   */
  getTextInputValue(customId) {
    const field = this.getField(customId);
    const expectedType = MessageComponentTypes.TEXT_INPUT;
    const actualType = typeof field.type === 'string' ? MessageComponentTypes[field.type] : field.type;
    if (actualType !== expectedType) {
      throw new TypeError('MODAL_SUBMIT_INTERACTION_FIELD_TYPE', customId, field.type, expectedType);
    }
    return field.value;
  }

  getStringSelectValues(customId) {
    return this.getField(customId).values ?? [];
  }

  getFileUploadValues(customId) {
    return this.getField(customId).values ?? [];
  }

  getRadioGroupValue(customId) {
    return this.getField(customId).value ?? null;
  }

  getCheckboxGroupValues(customId) {
    return this.getField(customId).values ?? [];
  }

  getCheckboxValue(customId) {
    return this.getField(customId).value ?? false;
  }
}

module.exports = ModalSubmitFieldsResolver;
