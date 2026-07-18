'use strict';

const noop = () => {}; // eslint-disable-line no-empty-function
const methods = ['get', 'post', 'delete', 'patch', 'put'];
const reflectors = [
  'toString',
  'valueOf',
  'inspect',
  'constructor',
  Symbol.toPrimitive,
  Symbol.for('nodejs.util.inspect.custom'),
];

function buildRoute(manager) {
  const route = [''];
  const handler = {
    get(target, name) {
      if (reflectors.includes(name)) return () => route.join('/');
      if (methods.includes(name)) {
        const routeBucket = [];
        const bucketRoute = [];
        let majorParameter = 'global';
        for (let i = 0; i < route.length; i++) {
          // Reactions routes and sub-routes all share the same bucket
          if (route[i - 1] === 'reactions') break;

          const isSnowflake = /^\d{16,20}$/.test(route[i]);
          const isMajorId = isSnowflake && /^(channels|guilds|webhooks)$/.test(route[i - 1]);
          const isWebhookToken = i === 3 && route[1] === 'webhooks' && route.length > 3;

          if (isMajorId && majorParameter === 'global') {
            majorParameter = `${route[i - 1]}:${route[i]}`;
            if (route[i - 1] === 'webhooks' && route[i + 1]) majorParameter += `:${route[i + 1]}`;
          }

          // Keep major ids in the public route for backwards-compatible rate-limit events,
          // but never expose webhook tokens. The bucket route excludes all major values.
          routeBucket.push(isWebhookToken ? ':token' : isSnowflake && !isMajorId ? ':id' : route[i]);
          bucketRoute.push(isWebhookToken ? ':token' : isSnowflake ? ':id' : route[i]);
        }
        return options =>
          manager.request(
            name,
            route.join('/'),
            Object.assign(
              {
                versioned: manager.versioned,
                route: routeBucket.join('/'),
                bucketRoute: bucketRoute.join('/'),
                majorParameter,
              },
              options,
            ),
          );
      }
      route.push(name);
      return new Proxy(noop, handler);
    },
    apply(target, _, args) {
      route.push(...args.filter(x => x != null)); // eslint-disable-line eqeqeq
      return new Proxy(noop, handler);
    },
  };
  return new Proxy(noop, handler);
}

module.exports = buildRoute;
