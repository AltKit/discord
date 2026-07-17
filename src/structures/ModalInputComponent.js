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
    this.required = data.required ?? false;
    this.minValues = data.min_values ?? data.minValues ?? null;
    this.maxValues = data.max_values ?? data.maxValues ?? null;
    this.value = data.value ?? data.default ?? null;
    this.values = data.values ?? null;
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
    return {
      type: typeof this.type === 'string' ? MessageComponentTypes[this.type] : this.type,
      custom_id: this.customId,
      options: this.options,
      required: this.required,
      min_values: this.minValues,
      max_values: this.maxValues,
      value: this.value,
      values: this.values,
    };
  }
}

module.exports = ModalInputComponent;
