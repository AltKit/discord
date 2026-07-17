import { defineConfig } from 'vitepress';

const githubRepository = process.env.GITHUB_REPOSITORY;
const repositorySlug = githubRepository || 'altkit/discord';
const repositoryName = repositorySlug.split('/').at(-1);
const isUserPagesRepository = repositoryName.endsWith('.github.io');
const base = process.env.DOCS_BASE || (githubRepository && !isUserPagesRepository ? `/${repositoryName}/` : '/');
const repositoryUrl = `https://github.com/${repositorySlug}`;

export default defineConfig({
  title: 'Altkit Discord',
  titleTemplate: ':title · Altkit Discord',
  description: 'Documentation for the Discord.js v14-compatible selfbot library.',
  base,
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['meta', { name: 'theme-color', content: '#8b5cf6' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'Altkit Discord' }],
    ['link', { rel: 'icon', href: `${base}logo.svg`, type: 'image/svg+xml' }],
  ],
  markdown: {
    lineNumbers: true,
  },
  vite: {
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          if (warning.code === 'INVALID_ANNOTATION' && warning.id?.includes('@vueuse/core/')) return;
          warn(warning);
        },
      },
    },
  },
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'Altkit Discord',
    nav: [
      { text: 'Guide', link: '/guide/getting-started', activeMatch: '/guide/' },
      { text: 'Examples', link: '/examples/', activeMatch: '/examples/' },
      { text: 'API', link: '/api/', activeMatch: '/api/' },
      { text: 'v4 migration', link: '/migrate' },
      {
        text: '4.0.0',
        items: [
          { text: 'npm package', link: 'https://www.npmjs.com/package/@altkit/discord' },
          { text: 'Changelog & migration', link: '/migrate' },
        ],
      },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Package overview', link: '/guide/overview' },
            { text: 'Getting started', link: '/guide/getting-started' },
            { text: 'Security & account safety', link: '/guide/security' },
            { text: 'Discord.js compatibility', link: '/guide/compatibility' },
          ],
        },
        {
          text: 'Core concepts',
          items: [
            { text: 'Client configuration', link: '/guide/client-configuration' },
            { text: 'Events & partials', link: '/guide/events-and-partials' },
            { text: 'Messages & polls', link: '/guide/messages-and-polls' },
            { text: 'Slash command invocation', link: '/guide/interactions' },
            { text: 'Presence & activities', link: '/guide/presence' },
            { text: 'Voice & media', link: '/guide/voice-and-media' },
          ],
        },
        {
          text: 'Working with Discord',
          items: [
            { text: 'Guilds, channels & managers', link: '/guide/guilds-and-channels' },
            { text: 'Users, relationships & settings', link: '/guide/users-and-relationships' },
            { text: 'Invites & applications', link: '/guide/invites-and-applications' },
            { text: 'Collectors', link: '/guide/collectors' },
            { text: 'Webhooks', link: '/guide/webhooks' },
            { text: 'Permissions & bit fields', link: '/guide/permissions-and-bitfields' },
            { text: 'REST & rate limits', link: '/guide/rest-and-rate-limits' },
          ],
        },
        {
          text: 'Project',
          items: [
            { text: 'Troubleshooting', link: '/guide/troubleshooting' },
            { text: 'Contributing & releases', link: '/devguide' },
            { text: 'v4 migration guide', link: '/migrate' },
          ],
        },
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Example gallery', link: '/examples/' },
            { text: 'Slash commands', link: '/examples/slash-commands' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API reference',
          items: [
            { text: 'Symbol catalog', link: '/api/' },
            { text: 'Events', link: '/api/events' },
            { text: 'Exports & aliases', link: '/api/exports' },
          ],
        },
        {
          text: 'Common symbols',
          items: [
            { text: 'Client', link: '/api/classes/client' },
            { text: 'ClientOptions', link: '/api/typedefs/clientoptions' },
            { text: 'Message', link: '/api/classes/message' },
            { text: 'TextBasedChannel', link: '/api/interfaces/textbasedchannel' },
            { text: 'Guild', link: '/api/classes/guild' },
            { text: 'User', link: '/api/classes/user' },
          ],
        },
      ],
    },
    socialLinks: [{ icon: 'github', link: repositoryUrl }],
    editLink: {
      pattern: `${repositoryUrl}/edit/selfbotjs/docs/:path`,
      text: 'Edit this page on GitHub',
    },
    search: {
      provider: 'local',
      options: {
        detailedView: true,
      },
    },
    outline: {
      level: [2, 3],
      label: 'On this page',
    },
    lastUpdated: {
      text: 'Last updated',
      formatOptions: {
        dateStyle: 'medium',
        timeStyle: 'short',
      },
    },
    footer: {
      message: 'Unofficial software. Not affiliated with or supported by Discord.',
      copyright: 'Released under the GNU General Public License v3.0.',
    },
  },
});
