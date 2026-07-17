const categories = ['classes', 'functions', 'interfaces', 'typedefs', 'externals'];

export function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function createSymbolIndex(data) {
  const index = new Map();

  for (const category of categories) {
    for (const entry of data[category] || []) {
      if (!index.has(entry.name)) {
        index.set(entry.name, `/api/${category}/${slugify(entry.name)}`);
      }
    }
  }

  return index;
}

function flatten(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(flatten).join('');
  if (value.types) return formatType(value.types);
  return '';
}

export function formatType(value) {
  if (value === undefined || value === null) return 'unknown';
  const source = value.types || value;
  if (!Array.isArray(source)) return flatten(source) || 'unknown';

  const alternatives = source.map(flatten).filter(Boolean);
  return alternatives.join(' | ') || 'unknown';
}

function escapeInlineCode(value) {
  return String(value).replace(/`/g, '\\`').replace(/\|/g, '\\|');
}

function inlineCode(value) {
  return `\`${escapeInlineCode(value)}\``;
}

function cleanDescription(value, symbolIndex) {
  if (!value) return '';

  return String(value)
    .replace(/<\/?(?:info|warn)>/g, '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\{@link\s+([^}\s]+)(?:\s+([^}]+))?}/g, (_, rawTarget, label) => {
      if (/^https?:\/\//.test(rawTarget)) return `[${label || rawTarget}](${rawTarget})`;

      const [symbol, member] = rawTarget.split('#');
      const target = symbolIndex.get(symbol);
      if (!target) return inlineCode(label || rawTarget);
      return `[${label || rawTarget}](${target}${member ? `#${slugify(member)}` : ''})`;
    })
    .replace(/\r\n/g, '\n')
    .trim();
}

function sourceLink(meta, repositoryUrl) {
  if (!meta?.path || !meta?.file) return '';
  const file = `${meta.path}/${meta.file}`;
  const line = meta.line ? `#L${meta.line}` : '';
  return `[Source](${repositoryUrl}/blob/selfbotjs/${file}${line})`;
}

function flagsFor(entry) {
  return [
    entry.scope === 'static' && 'static',
    entry.async && 'async',
    entry.readonly && 'readonly',
    entry.nullable && 'nullable',
    entry.optional && 'optional',
    entry.abstract && 'abstract',
    entry.access && entry.access !== 'public' && entry.access,
    entry.deprecated && 'deprecated',
  ].filter(Boolean);
}

function renderFlags(entry) {
  const flags = flagsFor(entry);
  return flags.length ? `<span class="api-meta">${flags.join(' · ')}</span>` : '';
}

function renderDefault(entry) {
  if (!Object.prototype.hasOwnProperty.call(entry, 'default')) return '';
  return `**Default:** ${inlineCode(typeof entry.default === 'string' ? entry.default : JSON.stringify(entry.default))}`;
}

function renderParams(params, symbolIndex) {
  if (!params?.length) return '';

  const rows = params.map(param => {
    const name = `${param.name}${param.optional ? '?' : ''}`;
    const description = cleanDescription(param.description, symbolIndex).replace(/\n/g, '<br>');
    const defaultValue = Object.prototype.hasOwnProperty.call(param, 'default')
      ? ` Default: ${inlineCode(typeof param.default === 'string' ? param.default : JSON.stringify(param.default))}.`
      : '';
    return `| ${inlineCode(name)} | ${inlineCode(formatType(param.type))} | ${description}${defaultValue} |`;
  });

  return ['**Parameters**', '', '| Name | Type | Description |', '| --- | --- | --- |', ...rows].join('\n');
}

function renderReturns(returns, symbolIndex) {
  if (!returns) return '';
  const entries = Array.isArray(returns) ? returns : [returns];
  const type = formatType(entries);
  const descriptions = entries
    .map(entry => (entry && !Array.isArray(entry) ? cleanDescription(entry.description, symbolIndex) : ''))
    .filter(Boolean)
    .join(' ');
  return `**Returns:** ${inlineCode(type)}${descriptions ? ` — ${descriptions}` : ''}`;
}

function renderExamples(examples) {
  if (!examples?.length) return '';
  return examples.map(example => `\`\`\`js\n${String(example).trim()}\n\`\`\``).join('\n\n');
}

function renderMember(member, kind, symbolIndex, repositoryUrl) {
  const isCallable = kind === 'Method' || kind === 'Function';
  const parameters = member.params || [];
  const signature = isCallable
    ? `${member.async ? 'async ' : ''}${member.name}(${parameters
        .map(param => `${param.name}${param.optional ? '?' : ''}: ${formatType(param.type)}`)
        .join(', ')})${member.returns ? `: ${formatType(member.returns)}` : ''}`
    : `${member.name}: ${formatType(member.type)}`;
  const sections = [
    `### ${inlineCode(member.name)}`,
    '',
    renderFlags(member),
    '',
    `<div class="api-signature">${signature.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`,
    '',
    cleanDescription(member.description, symbolIndex),
    '',
    renderDefault(member),
    '',
    renderParams(member.params, symbolIndex),
    '',
    renderReturns(member.returns, symbolIndex),
    '',
    renderExamples(member.examples),
    '',
    sourceLink(member.meta, repositoryUrl),
  ];

  return sections.filter((value, index) => value || (sections[index - 1] && sections[index + 1])).join('\n').trim();
}

function renderMemberGroup(title, members, kind, symbolIndex, repositoryUrl) {
  if (!members?.length) return '';
  return [`## ${title}`, ...members.map(member => renderMember(member, kind, symbolIndex, repositoryUrl))].join('\n\n');
}

function renderConstructor(construct, symbolIndex) {
  if (!construct) return '';
  const signature = `new ${construct.name}(${(construct.params || [])
    .map(param => `${param.name}${param.optional ? '?' : ''}: ${formatType(param.type)}`)
    .join(', ')})`;

  return [
    '## Constructor',
    '',
    `<div class="api-signature">${signature.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`,
    '',
    renderParams(construct.params, symbolIndex),
  ].join('\n');
}

function renderSee(see) {
  if (!see?.length) return '';
  return ['## See also', ...see.map(value => `- ${value}`)].join('\n');
}

export function renderApiPage(entry, category, data, repositoryUrl) {
  const symbolIndex = createSymbolIndex(data);
  const displayCategory = category.slice(0, -1);
  const extendsText = entry.extends ? formatType(entry.extends) : '';
  const implementsText = entry.implements ? formatType(entry.implements) : '';
  const headerMeta = [
    `<span class="api-badge">${displayCategory}</span>`,
    entry.deprecated ? '<span class="api-badge">deprecated</span>' : '',
    sourceLink(entry.meta, repositoryUrl),
  ].filter(Boolean);

  const sections = [
    '---',
    `title: ${JSON.stringify(entry.name)}`,
    `description: ${JSON.stringify(cleanDescription(entry.description, symbolIndex).replace(/\n/g, ' '))}`,
    'outline: deep',
    '---',
    '',
    `# ${inlineCode(entry.name)}`,
    '',
    headerMeta.join(' · '),
    '',
    cleanDescription(entry.description, symbolIndex),
    '',
    extendsText ? `**Extends:** ${inlineCode(extendsText)}` : '',
    implementsText ? `**Implements:** ${inlineCode(implementsText)}` : '',
    entry.type ? `**Type:** ${inlineCode(formatType(entry.type))}` : '',
    '',
    renderConstructor(entry.construct, symbolIndex),
    '',
    renderParams(entry.params, symbolIndex),
    '',
    renderReturns(entry.returns, symbolIndex),
    '',
    renderMemberGroup('Properties', entry.props, 'Property', symbolIndex, repositoryUrl),
    '',
    renderMemberGroup('Methods', entry.methods, 'Method', symbolIndex, repositoryUrl),
    '',
    renderMemberGroup('Events', entry.events, 'Event', symbolIndex, repositoryUrl),
    '',
    renderExamples(entry.examples),
    '',
    renderSee(entry.see),
  ];

  return sections.filter((value, index) => value || (sections[index - 1] && sections[index + 1])).join('\n').trim();
}

export function getCategories() {
  return categories;
}
