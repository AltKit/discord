<script setup>
import { computed, ref } from 'vue';
import { withBase } from 'vitepress';
import { data as symbols } from '../../../api/catalog.data.mjs';

const query = ref('');
const category = ref('all');

const categories = computed(() => [
  { value: 'all', label: 'All', count: symbols.length },
  ...Object.entries(
    symbols.reduce((counts, symbol) => {
      counts[symbol.category] = (counts[symbol.category] || 0) + 1;
      return counts;
    }, {}),
  ).map(([value, count]) => ({ value, label: value, count })),
]);

const filteredSymbols = computed(() => {
  const needle = query.value.trim().toLowerCase();
  return symbols.filter(symbol => {
    const matchesCategory = category.value === 'all' || symbol.category === category.value;
    const matchesQuery = !needle || `${symbol.name} ${symbol.description}`.toLowerCase().includes(needle);
    return matchesCategory && matchesQuery;
  });
});
</script>

<template>
  <div class="api-catalog">
    <div class="api-catalog__toolbar">
      <input
        v-model="query"
        class="api-catalog__search"
        type="search"
        placeholder="Search names and descriptions…"
        aria-label="Search the API reference"
      />
      <div class="api-catalog__filters" aria-label="Filter API symbols by category">
        <button
          v-for="item in categories"
          :key="item.value"
          class="api-catalog__filter"
          type="button"
          :aria-pressed="category === item.value"
          @click="category = item.value"
        >
          {{ item.label }} ({{ item.count }})
        </button>
      </div>
    </div>

    <p class="api-catalog__summary">
      Showing {{ filteredSymbols.length }} of {{ symbols.length }} documented symbols.
    </p>

    <div v-if="filteredSymbols.length" class="api-catalog__grid">
      <a
        v-for="symbol in filteredSymbols"
        :key="`${symbol.category}:${symbol.name}`"
        class="api-card"
        :href="withBase(symbol.url)"
      >
        <span class="api-card__header">
          <span class="api-card__name">{{ symbol.name }}</span>
          <span class="api-card__kind">{{ symbol.category }}</span>
        </span>
        <span v-if="symbol.description" class="api-card__description">{{ symbol.description }}</span>
      </a>
    </div>
    <p v-else>No API symbols match this filter.</p>
  </div>
</template>
