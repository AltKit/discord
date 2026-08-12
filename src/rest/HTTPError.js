'use strict';

/**
 * Represents an HTTP error from a request.
 * @extends Error
 */
class HTTPError extends Error {
  constructor(message, name, code, request) {
    super(message);

    /**
     * The name of the error
     * @type {string}
     */
    this.name = name;

    /**
     * HTTP error code returned from the request
     * @type {number}
     */
    this.code = code ?? 500;

    /**
     * The HTTP method used for the request
     * @type {string}
     */
    this.method = request.method;

    /**
     * The path of the request relative to the HTTP endpoint
     * @type {string}
     */
    this.path = request.path;

    /**
     * The HTTP data that was sent to Discord
     * @typedef {Object} HTTPErrorData
     * @property {*} json The JSON data that was sent
     * @property {HTTPAttachmentData[]} files The files that were sent with this request, if any
     */

    /**
     * The attachment data that is sent to Discord
     * @typedef {Object} HTTPAttachmentData
     * @property {string|Buffer|Stream} attachment The source of this attachment data
     * @property {string} name The file name
     * @property {Buffer|Stream} file The file buffer
     */

    /**
     * The data associated with the request that caused this error
     * @type {HTTPErrorData}
     */
    this.requestData = {
      json: HTTPError._sanitizeRequestData(request.options.data),
      files: request.options.files ?? [],
      headers: request.options.headers,
    };
  }

  /**
   * Sanitizes request data to prevent credential leakage in error logs
   * @param {*} data Request data object
   * @returns {*} Sanitized data
   * @private
   */
  static _sanitizeRequestData(data) {
    if (!data || typeof data !== 'object') return data;
    const sanitized = { ...data };
    if (sanitized.password) sanitized.password = '[REDACTED]';
    if (sanitized.code) sanitized.code = '[REDACTED]';
    if (sanitized.token) sanitized.token = '[REDACTED]';
    return sanitized;
  }
}

module.exports = HTTPError;
