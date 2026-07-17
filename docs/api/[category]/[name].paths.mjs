import fs from 'node:fs';
import { getCategories, renderApiPage, slugify } from '../api-render.mjs';

export default {
  watch: ['../../main.json'],
  paths() {
    const data = JSON.parse(fs.readFileSync(new URL('../../main.json', import.meta.url), 'utf8'));
    const githubRepository = process.env.GITHUB_REPOSITORY || 'altkit/discord';
    const repositoryUrl = `https://github.com/${githubRepository}`;

    return getCategories().flatMap(category =>
      (data[category] || []).map(entry => ({
        params: {
          category,
          name: slugify(entry.name),
        },
        content: renderApiPage(entry, category, data, repositoryUrl),
      })),
    );
  },
};
