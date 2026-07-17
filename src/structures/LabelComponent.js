'use strict';

const BaseMessageComponent = require('./BaseMessageComponent');
const { MessageComponentTypes } = require('../util/Constants');

/**
 * Represents a label and its nested modal input component.
 * @extends {BaseMessageComponent}
 */
class LabelComponent extends BaseMessageComponent {
  constructor(data = {}, client = null) {
    super({ type: 'LABEL' });
    this.setup(data);
    this.label = data.label ?? null;
    this.description = data.description ?? null;
    this.component = data.component ? BaseMessageComponent.create(data.component, client) : null;
  }

  toJSON() {
    return {
      type: MessageComponentTypes[this.type],
      label: this.label,
      description: this.description,
      component: this.component?.toJSON(),
    };
  }
}

module.exports = LabelComponent;
