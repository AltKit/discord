'use strict';

const BaseMessageComponent = require('./BaseMessageComponent');
const { MessageComponentTypes } = require('../util/Constants');

/**
 * Represents one of Discord's v14 modal-only input components.
 * This includes file uploads, radio groups, checkbox groups, and checkboxes.
 * @extends {BaseMessageComponent}
 */
class ModalInputComponent extends BaseMessageComponent {
  constructor(data = {}) {
    super({ type: BaseMessageComponent.resolveType(data.type) });
    this.setup(data);
  }

  setup(data) {
    super.setup(data);
    this.customId = data.custom_id ?? data.customId ?? null;
    this.options = data.options ?? [];
    this.required = data.required ?? null;
    this.minValues = data.min_values ?? data.minValues ?? null;
    this.maxValues = data.max_values ?? data.maxValues ?? null;
    this.fileTypes = data.file_types ?? data.fileTypes ?? null;
    this.default = data.default ?? null;
    this.value = data.value ?? null;
    this.values = data.values ?? null;
  }

  /**
   * Sets the allowed file types for a file upload component.
   * @param {...(FileUploadType|string)} types The allowed file types
   * @returns {ModalInputComponent} This component
   * @example
   * // Only allow images and dot-prefixed extensions, up to 10 entries
   * new ModalInputComponent({ type: 'FILE_UPLOAD' })
   *   .setFileTypes('image', '.png', '.jpg')
   */
  setFileTypes(...types) {
    this.fileTypes = types.flat(Infinity);
    return this;
  }

  setValue(value) {
    this.value = value;
    return this;
  }

  setValues(...values) {
    this.values = values.flat(Infinity);
    return this;
  }

  toJSON() {
    const data = {
      type: typeof this.type === 'string' ? MessageComponentTypes[this.type] : this.type,
      custom_id: this.customId,
    };

    if (this.type === 'FILE_UPLOAD') {
      if (this.minValues !== null) data.min_values = this.minValues;
      if (this.maxValues !== null) data.max_values = this.maxValues;
      if (this.required !== null) data.required = this.required;
      if (this.fileTypes !== null) data.file_types = this.fileTypes;
    } else if (this.type === 'RADIO_GROUP') {
      data.options = this.options;
      if (this.required !== null) data.required = this.required;
      if (this.value !== null) data.value = this.value;
    } else if (this.type === 'CHECKBOX_GROUP') {
      data.options = this.options;
      if (this.minValues !== null) data.min_values = this.minValues;
      if (this.maxValues !== null) data.max_values = this.maxValues;
      if (this.required !== null) data.required = this.required;
      if (this.values !== null) data.values = this.values;
    } else if (this.type === 'CHECKBOX') {
      if (this.default !== null) data.default = this.default;
      if (this.value !== null) data.value = this.value;
    }

    return data;
  }
}

module.exports = ModalInputComponent;
