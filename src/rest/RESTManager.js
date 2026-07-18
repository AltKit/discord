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
const { ciphers, Endpoints } = require('../util/Constants');
const Util = require('../util/Util');

class RESTManager {
  constructor(client) {
    this.client = client;
    this.handlers = new Collection();
    this.versioned = true;
    this.globalLimit = client.options.restGlobalRateLimit > 0 ? client.options.restGlobalRateLimit : Infinity;
    this.globalRemaining = this.globalLimit;
    this.globalReset = null;
    this.globalDelay = null;
    this.cookieJar = new CookieJar();
    this.fetch = makeFetchCookie.default(fetchOriginal, this.cookieJar);
    this.dispatcher = null;
    this.destroyed = false;
    if (Number.isFinite(client.options.restSweepInterval) && client.options.restSweepInterval > 0) {
      this.sweepInterval = setInterval(() => {
        this.handlers.sweep(handler => handler._inactive);
      }, client.options.restSweepInterval * 1_000).unref();
    }
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

    const proxyOptions = Util.checkUndiciProxyAgent(this.client.options.http.agent);
    this.dispatcher = proxyOptions
      ? new ProxyAgent({ ...proxyOptions, ciphers: ciphers.join(':') })
      : new Agent({ connect: buildConnector({ ciphers: ciphers.join(':') }) });
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
    let handler = this.handlers.get(apiRequest.route);

    if (!handler) {
      handler = new RequestHandler(this);
      this.handlers.set(apiRequest.route, handler);
    }

    return handler.push(apiRequest);
  }

  get endpoint() {
    return this.client.options.http.api;
  }

  set endpoint(endpoint) {
    this.client.options.http.api = endpoint;
  }
}

module.exports = RESTManager;
