'use strict';

// hCaptcha solving adapter example.
//
// Discord occasionally requires an hCaptcha challenge before a REST request
// succeeds. When it does, Altkit Discord calls ClientOptions.captchaSolver
// with the challenge payload and the user agent Discord observed, then
// replays the request with the returned token.
//
// This example delegates solving to the CapSolver service. Replace the
// provider, endpoints, and task shape with the service you use, and verify
// the provider's current API before relying on it. Solving services are a
// trust boundary: they receive challenge data and your API key, and every
// solve usually costs money.
//
// Environment:
//   DISCORD_TOKEN        user token (required)
//   CAPSOLVER_API_KEY    CapSolver client key (required)
//
// Run with:
//   node --env-file=.env examples/CaptchaSolver.js

const { Client, Events } = require('@altkit/discord');

async function solveCaptcha(captcha, userAgent) {
  const clientKey = process.env.CAPSOLVER_API_KEY;
  if (!clientKey) throw new Error('CAPSOLVER_API_KEY is not set');

  const task = {
    type: 'HCaptchaTaskProxyLess',
    websiteURL: 'https://discord.com',
    websiteKey: captcha.captcha_sitekey,
    // hCaptcha "enterprise" flows pass request data through to the solver.
    ...(captcha.captcha_rqdata ? { enterprisePayload: { rqdata: captcha.captcha_rqdata } } : {}),
    userAgent,
  };

  const created = await fetch('https://api.capsolver.com/createTask', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clientKey, task }),
  }).then(response => response.json());

  if (!created.taskId) {
    throw new Error(`CapSolver could not create a task: ${JSON.stringify(created)}`);
  }

  // Poll until the task is solved. A real implementation should impose its
  // own timeout instead of polling forever.
  for (;;) {
    const result = await fetch('https://api.capsolver.com/getTaskResult', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ clientKey, taskId: created.taskId }),
    }).then(response => response.json());

    if (result.status === 'ready') return result.solution.gRecaptchaResponse;
    if (result.status === 'failed') throw new Error(`CapSolver task failed: ${JSON.stringify(result)}`);
    await new Promise(resolve => setTimeout(resolve, 3_000));
  }
}

const client = new Client({
  // Bound how many times a single request is re-solved so failed solves do
  // not loop forever.
  captchaRetryLimit: 2,
  captchaSolver: solveCaptcha,
});

client.once(Events.ClientReady, readyClient => {
  console.log(`${readyClient.user.tag} is ready`);
});

client.on(Events.MessageCreate, message => {
  console.log(message.id, message.content);
});

client.login(process.env.DISCORD_TOKEN);
