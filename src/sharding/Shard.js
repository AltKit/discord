'use strict';

const EventEmitter = require('node:events');
const path = require('node:path');
const process = require('node:process');
const { setTimeout } = require('node:timers');
const { setTimeout: sleep } = require('node:timers/promises');
const { Error } = require('../errors');
const Util = require('../util/Util');
let childProcess = null;
let Worker = null;

/**
 * A self-contained shard created by the {@link ShardingManager}. Each one has a {@link ChildProcess} that contains
 * an instance of the bot and its {@link Client}. When its child process/worker exits for any reason, the shard will
 * spawn a new one to replace it as necessary.
 * @extends {EventEmitter}
 * @deprecated
 */
class Shard extends EventEmitter {
  constructor(manager, id) {
    super();

    if (manager.mode === 'process') childProcess = require('node:child_process');
    else if (manager.mode === 'worker') Worker = require('node:worker_threads').Worker;

    /**
     * Manager that created the shard
     * @type {ShardingManager}
     */
    this.manager = manager;

    /**
     * The shard's id in the manager
     * @type {number}
     */
    this.id = id;

    /**
     * Arguments for the shard's process (only when {@link ShardingManager#mode} is `process`)
     * @type {string[]}
     */
    this.args = manager.shardArgs ?? [];

    /**
     * Arguments for the shard's process executable (only when {@link ShardingManager#mode} is `process`)
     * @type {string[]}
     */
    this.execArgv = manager.execArgv;

    /**
     * Environment variables for the shard's process, or workerData for the shard's worker
     * @type {Object}
     */
    this.env = Object.assign({}, process.env, {
      SHARDING_MANAGER: true,
      SHARDS: this.id,
      SHARD_COUNT: this.manager.totalShards,
      DISCORD_TOKEN: this.manager.token,
    });

    /**
     * Whether the shard's {@link Client} is ready
     * @type {boolean}
     */
    this.ready = false;

    /**
     * Process of the shard (if {@link ShardingManager#mode} is `process`)
     * @type {?ChildProcess}
     */
    this.process = null;

    /**
     * Worker of the shard (if {@link ShardingManager#mode} is `worker`)
     * @type {?Worker}
     */
    this.worker = null;

    /**
     * Ongoing operations for calls to {@link Shard#eval}, mapped by the `script` they were called with
     * @type {Map<string, Object>}
     * @private
     */
    this._evals = new Map();

    /**
     * Ongoing operations for calls to {@link Shard#fetchClientValue}, mapped by the `prop` they were called with
     * @type {Map<string, Object>}
     * @private
     */
    this._fetches = new Map();

    /**
     * Listener function for the {@link ChildProcess}' `exit` event
     * @type {Function}
     * @private
     */
    this._exitListener = null;
  }

  /**
   * Forks a child process or creates a worker thread for the shard.
   * <warn>You should not need to call this manually.</warn>
   * @param {number} [timeout=30000] The amount in milliseconds to wait until the {@link Client} has become ready
   * before resolving (`-1` or `Infinity` for no wait)
   * @returns {Promise<ChildProcess>}
   */
  spawn(timeout = 30_000) {
    if (this.process) throw new Error('SHARDING_PROCESS_EXISTS', this.id);
    if (this.worker) throw new Error('SHARDING_WORKER_EXISTS', this.id);

    this._exitListener = this._handleExit.bind(this, undefined, timeout);

    if (this.manager.mode === 'process') {
      this.process = childProcess
        .fork(path.resolve(this.manager.file), this.args, {
          env: this.env,
          execArgv: this.execArgv,
        })
        .on('message', this._handleMessage.bind(this))
        .on('exit', this._exitListener);
    } else if (this.manager.mode === 'worker') {
      this.worker = new Worker(path.resolve(this.manager.file), { workerData: this.env })
        .on('message', this._handleMessage.bind(this))
        .on('exit', this._exitListener);
    }

    this._evals.clear();
    this._fetches.clear();

    const child = this.process ?? this.worker;

    /**
     * Emitted upon the creation of the shard's child process/worker.
     * @event Shard#spawn
     * @param {ChildProcess|Worker} process Child process/worker that was created
     */
    this.emit('spawn', child);

    if (timeout === -1 || timeout === Infinity) return Promise.resolve(child);
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(spawnTimeoutTimer);
        this.off('ready', onReady);
        this.off('disconnect', onDisconnect);
        this.off('death', onDeath);
      };

      const onReady = () => {
        cleanup();
        resolve(child);
      };

      const onDisconnect = () => {
        cleanup();
        reject(new Error('SHARDING_READY_DISCONNECTED', this.id));
      };

      const onDeath = () => {
        cleanup();
        reject(new Error('SHARDING_READY_DIED', this.id));
      };

      const onTimeout = () => {
        cleanup();
        reject(new Error('SHARDING_READY_TIMEOUT', this.id));
      };

      const spawnTimeoutTimer = setTimeout(onTimeout, timeout);
      this.once('ready', onReady);
      this.once('disconnect', onDisconnect);
      this.once('death', onDeath);
    });
  }

  /**
   * Immediately kills the shard's process/worker and does not restart it.
   */
  kill() {
    if (this.process) {
      this.process.removeListener('exit', this._exitListener);
      this.process.kill();
    } else {
      this.worker.removeListener('exit', this._exitListener);
      this.worker.terminate();
    }

    this._handleExit(false);
  }

  /**
   * Options used to respawn a shard.
   * @typedef {Object} ShardRespawnOptions
   * @property {number} [delay=500] How long to wait between killing the process/worker and
   * restarting it (in milliseconds)
   * @property {number} [timeout=30000] The amount in milliseconds to wait until the {@link Client}
   * has become ready before resolving (`-1` or `Infinity` for no wait)
   */

  /**
   * Kills and restarts the shard's process/worker.
   * @param {ShardRespawnOptions} [options] Options for respawning the shard
   * @returns {Promise<ChildProcess>}
   */
  async respawn({ delay = 500, timeout = 30_000 } = {}) {
    this.kill();
    if (delay > 0) await sleep(delay);
    return this.spawn(timeout);
  }

  /**
   * Sends a message to the shard's process/worker.
   * @param {*} message Message to send to the shard
   * @returns {Promise<Shard>}
   */
  send(message) {
    return new Promise((resolve, reject) => {
      if (this.process) {
        this.process.send(message, err => {
          if (err) reject(err);
          else resolve(this);
        });
      } else {
        this.worker.postMessage(message);
        resolve(this);
      }
    });
  }

  /**
   * Fetches a client property value of the shard.
   * @param {string} prop Name of the client property to get, using periods for nesting
   * @returns {Promise<*>}
   * @example
   * shard.fetchClientValue('guilds.cache.size')
   *   .then(count => console.log(`${count} guilds in shard ${shard.id}`))
   *   .catch(console.error);
   */
  async fetchClientValue(prop) {
    // Shard is dead (maybe respawning), don't cache anything and error immediately
    if (!this.process && !this.worker) throw new Error('SHARDING_NO_CHILD_EXISTS', this.id);

    // Cached promise from previous call
    if (this._fetches.has(prop)) return this._fetches.get(prop).promise;

    return this._createPendingOperation(this._fetches, prop, '_fetchProp');
  }

  /**
   * Evaluates a script or function on the shard, in the context of the {@link Client}.
   * @param {string|Function} script JavaScript to run on the shard
   * @param {*} [context] The context for the eval
   * @returns {Promise<*>} Result of the script execution
   */
  async eval(script, context) {
    // Stringify the script if it's a Function
    const _eval = typeof script === 'function' ? `(${script})(this, ${JSON.stringify(context)})` : script;

    // Shard is dead (maybe respawning), don't cache anything and error immediately
    if (!this.process && !this.worker) throw new Error('SHARDING_NO_CHILD_EXISTS', this.id);

    // Cached promise from previous call
    if (this._evals.has(_eval)) return this._evals.get(_eval).promise;

    return this._createPendingOperation(this._evals, _eval, '_eval');
  }

  /**
   * Creates an IPC operation that can be cleaned up and rejected if the child exits.
   * @param {Map<string, Object>} operations Collection that owns the operation
   * @param {string} key Operation identifier
   * @param {string} messageKey IPC message property used for the identifier
   * @returns {Promise<*>}
   * @private
   */
  _createPendingOperation(operations, key, messageKey) {
    const child = this.process ?? this.worker;
    let active = true;
    let resolvePromise;
    let rejectPromise;

    const promise = new Promise((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });

    const cleanup = () => {
      if (!active) return;
      active = false;
      child.removeListener('message', listener);
      this.decrementMaxListeners(child);
      operations.delete(key);
    };

    const listener = message => {
      if (message?.[messageKey] !== key) return;
      cleanup();
      if (!message._error) resolvePromise(message._result);
      else rejectPromise(Util.makeError(message._error));
    };

    const operation = {
      promise,
      reject: error => {
        cleanup();
        rejectPromise(error);
      },
    };

    operations.set(key, operation);
    this.incrementMaxListeners(child);
    child.on('message', listener);
    this.send({ [messageKey]: key }).catch(operation.reject);
    return promise;
  }

  /**
   * Handles a message received from the child process/worker.
   * @param {*} message Message received
   * @private
   */
  _handleMessage(message) {
    if (message) {
      // Shard is ready
      if (message._ready) {
        this.ready = true;
        /**
         * Emitted upon the shard's {@link Client#event:shardReady} event.
         * @event Shard#ready
         */
        this.emit('ready');
        return;
      }

      // Shard has disconnected
      if (message._disconnect) {
        this.ready = false;
        /**
         * Emitted upon the shard's {@link Client#event:shardDisconnect} event.
         * @event Shard#disconnect
         */
        this.emit('disconnect');
        return;
      }

      // Shard is attempting to reconnect
      if (message._reconnecting) {
        this.ready = false;
        /**
         * Emitted upon the shard's {@link Client#event:shardReconnecting} event.
         * @event Shard#reconnecting
         */
        this.emit('reconnecting');
        return;
      }

      // Shard is requesting a property fetch
      if (message._sFetchProp) {
        const resp = { _sFetchProp: message._sFetchProp, _sFetchPropShard: message._sFetchPropShard };
        this.manager.fetchClientValues(message._sFetchProp, message._sFetchPropShard).then(
          results => this.send({ ...resp, _result: results }),
          err => this.send({ ...resp, _error: Util.makePlainError(err) }),
        );
        return;
      }

      // Shard is requesting an eval broadcast
      if (message._sEval) {
        const resp = { _sEval: message._sEval, _sEvalShard: message._sEvalShard };
        this.manager._performOnShards('eval', [message._sEval], message._sEvalShard).then(
          results => this.send({ ...resp, _result: results }),
          err => this.send({ ...resp, _error: Util.makePlainError(err) }),
        );
        return;
      }

      // Shard is requesting a respawn of all shards
      if (message._sRespawnAll) {
        const { shardDelay, respawnDelay, timeout } = message._sRespawnAll;
        this.manager.respawnAll({ shardDelay, respawnDelay, timeout }).catch(() => {
          // Do nothing
        });
        return;
      }
    }

    /**
     * Emitted upon receiving a message from the child process/worker.
     * @event Shard#message
     * @param {*} message Message that was received
     */
    this.emit('message', message);
  }

  /**
   * Handles the shard's process/worker exiting.
   * @param {boolean} [respawn=this.manager.respawn] Whether to spawn the shard again
   * @param {number} [timeout] The amount in milliseconds to wait until the {@link Client}
   * has become ready (`-1` or `Infinity` for no wait)
   * @private
   */
  _handleExit(respawn = this.manager.respawn, timeout) {
    /**
     * Emitted upon the shard's child process/worker exiting.
     * @event Shard#death
     * @param {ChildProcess|Worker} process Child process/worker that exited
     */
    this.emit('death', this.process ?? this.worker);

    const pendingOperations = [...this._evals.values(), ...this._fetches.values()];
    for (const operation of pendingOperations) {
      operation.reject(new Error('SHARDING_CHILD_DIED', this.id));
    }

    this.ready = false;
    this.process = null;
    this.worker = null;
    this._evals.clear();
    this._fetches.clear();

    if (respawn) this.spawn(timeout).catch(err => this.emit('error', err));
  }

  /**
   * Increments max listeners by one for a given emitter, if they are not zero.
   * @param {EventEmitter|process} emitter The emitter that emits the events.
   * @private
   */
  incrementMaxListeners(emitter) {
    const maxListeners = emitter.getMaxListeners();
    if (maxListeners !== 0) {
      emitter.setMaxListeners(maxListeners + 1);
    }
  }

  /**
   * Decrements max listeners by one for a given emitter, if they are not zero.
   * @param {EventEmitter|process} emitter The emitter that emits the events.
   * @private
   */
  decrementMaxListeners(emitter) {
    const maxListeners = emitter.getMaxListeners();
    if (maxListeners !== 0) {
      emitter.setMaxListeners(maxListeners - 1);
    }
  }
}

module.exports = Shard;
