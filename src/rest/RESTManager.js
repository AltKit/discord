'use strict';

const { setInterval } = require('node:timers');
const { Collection } = require('@discordjs/collection');
const makeFetchCookie = require('fetch-cookie');
const { CookieJar } = require('tough-cookie');
const { Agent, buildConnector, fetch: fetchOriginal, ProxyAgent } = require('undici');
const APIRequest = require('./APIRequest');
const routeBuilder = require('./APIRouter');
const RequestHandler = require('./RequestHandler');
const { Error } = require('../errors');
const { Endpoints } = require('../util/Constants');
const Util = require('../util/Util');

class RESTManager {
  constructor(client) {
    this.client = client;
    this.handlers = new Collection();
    this.hashes = new Collection();
    this.versioned = true;
    this.globalLimit = client.options.restGlobalRateLimit > 0 ? client.options.restGlobalRateLimit : Infinity;
    this.globalRemaining = this.globalLimit;
    this.globalReset = null;
    this.globalDelay = null;
    this.cookieJar = new CookieJar();
    this.fetch = makeFetchCookie.default(fetchOriginal, this.cookieJar);
    this.dispatcher = null;
    this.destroyed = false;

    // Cache expensive computations for performance (Perf #2.1)
    this._cachedTimezone = null;
    this._cachedSuperProperties = null;

    if (Number.isFinite(client.options.restSweepInterval) && client.options.restSweepInterval > 0) {
      this.sweepInterval = setInterval(() => {
        this.handlers.sweep(handler => handler._inactive);
      }, client.options.restSweepInterval * 1_000).unref();
    }
  }

  /**
   * Get cached timezone or compute and cache it
   * @returns {string}
   * @private
   */
  _getTimezone() {
    if (!this._cachedTimezone) {
      this._cachedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    return this._cachedTimezone;
  }

  /**
   * Get cached super-properties or compute and cache them
   * @returns {string}
   * @private
   */
  _getSuperProperties() {
    if (!this._cachedSuperProperties) {
      this._cachedSuperProperties = Buffer.from(JSON.stringify(this.client.options.ws.properties), 'ascii').toString(
        'base64',
      );
    }
    return this._cachedSuperProperties;
  }

  /**
   * Invalidate cached super-properties (call when ws.properties changes)
   * @private
   */
  _invalidateSuperPropertiesCache() {
    this._cachedSuperProperties = null;
  }

  get api() {
    return routeBuilder(this);
  }

  getAuth() {
    const token = this.client.token ?? this.client.accessToken;
    if (token) return token;
    throw new Error('TOKEN_MISSING');
  }

  get cdn() {
    return Endpoints.CDN(this.client.options.http.cdn);
  }

  getDispatcher() {
    if (this.destroyed) throw new Error('CLIENT_DESTROYED');
    if (this.dispatcher) return this.dispatcher;

    const { agent, tls } = this.client.options.http;
    const proxyOptions = Util.checkUndiciProxyAgent(agent);
    const requestTLS = Util.createTLSOptions({
      ...(!proxyOptions && typeof agent === 'object' && agent !== null
        ? Util.createTLSOptions(agent)
        : proxyOptions?.requestTls),
      ...(tls && typeof tls === 'object' ? tls : {}),
    });
    this.dispatcher = proxyOptions
      ? new ProxyAgent({ ...proxyOptions, requestTls: requestTLS })
      : new Agent({ connect: buildConnector(requestTLS) });
    return this.dispatcher;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
      this.sweepInterval = null;
    }
    this.handlers.clear();
    this.hashes.clear();
    this.cookieJar.removeAllCookiesSync();
    if (this.dispatcher) {
      for (const method of ['destroy', 'close']) {
        if (typeof this.dispatcher[method] !== 'function') continue;
        try {
          this.dispatcher[method]()?.catch?.(() => {});
          break;
        } catch {
          // Try the next cleanup method when the dispatcher does not support this one.
        }
      }
      this.dispatcher = null;
    }
  }

  request(method, url, options = {}) {
    const apiRequest = new APIRequest(this, method, url, options);
    const bucketHash = this.hashes.get(apiRequest.routeId);
    const handlerId = `${bucketHash ?? apiRequest.routeId}:${apiRequest.majorParameter}`;
    let handler = this.handlers.get(handlerId);

    if (!handler) {
      handler = new RequestHandler(this);
      this.handlers.set(handlerId, handler);
    }

    return handler.push(apiRequest);
  }

  updateBucketHash(request, bucketHash, handler) {
    if (!bucketHash) return;

    this.hashes.set(request.routeId, bucketHash);
    const handlerId = `${bucketHash}:${request.majorParameter}`;
    const existing = this.handlers.get(handlerId);

    if (existing && existing !== handler) {
      existing.limit = Math.max(existing.limit, handler.limit);
      if (existing.remaining < 0) existing.remaining = handler.remaining;
      else if (handler.remaining >= 0) existing.remaining = Math.min(existing.remaining, handler.remaining);
      existing.reset = Math.max(existing.reset, handler.reset);
      return;
    }

    for (const [key, value] of this.handlers) {
      if (value === handler && key !== handlerId) this.handlers.delete(key);
    }
    this.handlers.set(handlerId, handler);
  }

  get endpoint() {
    return this.client.options.http.api;
  }

  set endpoint(endpoint) {
    this.client.options.http.api = endpoint;
  }
}

module.exports = RESTManager;
