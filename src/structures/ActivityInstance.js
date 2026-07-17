'use strict';

const ActivityLocation = require('./ActivityLocation');
const Base = require('./Base');

class ActivityInstance extends Base {
  constructor(client, data) {
    super(client);
    this.applicationId = data.application_id;
    this.instanceId = data.instance_id;
    this.launchId = data.launch_id;
    this.location = new ActivityLocation(client, data.location);
    this.users = data.users;
  }
}

module.exports = ActivityInstance;
