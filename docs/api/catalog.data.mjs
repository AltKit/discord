import fs from 'node:fs';
import { createSymbolIndex, getCategories, slugify } from './api-render.mjs';

export default {
  watch: ['../main.json'],
  load() {
    const data = JSON.parse(fs.readFileSync(new URL('../main.json', import.meta.url), 'utf8'));
    const symbolIndex = createSymbolIndex(data);

    return getCategories()
      .flatMap(category =>
        (data[category] || []).map(entry => ({
          name: entry.name,
          category,
          description: String(entry.description || '')
            .replace(/<\/?(?:info|warn)>/g, '')
            .replace(/\{@link\s+([^}\s]+)(?:\s+([^}]+))?}/g, (_, target, label) => label || target)
            .replace(/\s+/g, ' ')
            .trim(),
          url: symbolIndex.get(entry.name) || `/api/${category}/${slugify(entry.name)}`,
        })),
      )
      .sort((left, right) => left.name.localeCompare(right.name) || left.category.localeCompare(right.category));
  },
};
