/**
 * Prompt sizing helpers.
 *
 * Chrome's built-in model enforces a hard per-session input quota and throws
 * "The input is too large." when a prompt exceeds it, so every prompt is
 * rendered against a character budget instead of being concatenated blindly.
 */

/** Rough conversion used before the real tokenizer is available. */
export const CHARS_PER_TOKEN = 4;

/** Budgets for providers that do not report a quota we can query. */
export const PROVIDER_BUDGET_CHARS = {
  chrome: 3200,
  ollama: 16000,
  default: 48000,
};

export const charsForTokens = (tokens) => Math.max(0, Math.floor(tokens * CHARS_PER_TOKEN));

const OMITTED = (n) => `... ${n} more omitted`;

/**
 * Keeps whole leading lines of `text` that fit in `maxChars`, noting the rest.
 * Input is expected to be ordered most-important-first.
 */
export const trimLines = (text, maxChars) => {
  if (!text) return '';
  if (maxChars <= 0) return '';
  if (text.length <= maxChars) return text;

  const lines = text.split('\n');
  const kept = [];
  let used = 0;
  let dropped = 0;

  lines.forEach((line) => {
    const cost = line.length + 1;
    // Leave room for the omission marker once anything has been dropped.
    if (dropped > 0 || used + cost > maxChars - 24) {
      dropped += 1;
      return;
    }
    kept.push(line);
    used += cost;
  });

  if (dropped) kept.push(OMITTED(dropped));
  return kept.join('\n');
};

/**
 * Keeps as many leading array items as fit once serialized to JSON.
 * `shrinkItem` produces a smaller version of an item for a second pass.
 */
export const trimJsonList = (items, maxChars, shrinkItem) => {
  const fits = (list) => JSON.stringify(list).length <= maxChars;
  if (fits(items)) return items;

  if (shrinkItem) {
    const small = items.map(shrinkItem);
    if (fits(small)) return small;
    let low = 0;
    let high = small.length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (fits(small.slice(0, mid))) low = mid;
      else high = mid - 1;
    }
    return small.slice(0, low);
  }

  let low = 0;
  let high = items.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (fits(items.slice(0, mid))) low = mid;
    else high = mid - 1;
  }
  return items.slice(0, low);
};

/**
 * Renders labelled sections within `maxChars`.
 * Each section is `{ label, body, weight, required }`. Required sections are
 * emitted in full; the rest share what is left by weight, with any unused
 * share handed back to sections that still want more.
 */
export const renderSections = (sections, maxChars) => {
  const active = sections.filter((section) => section.body);
  const overhead = (section) => section.label.length + 3;

  const required = active.filter((section) => section.required);
  const optional = active.filter((section) => !section.required);

  const fixed = required.reduce(
    (sum, section) => sum + section.body.length + overhead(section),
    0,
  );

  // Water-fill: sections that need less than their share release the surplus.
  let pool = Math.max(0, maxChars - fixed);
  let contenders = optional.map((section) => ({
    section,
    need: section.body.length + overhead(section),
    allowance: 0,
  }));
  const settled = [];

  while (contenders.length) {
    const weight = contenders.reduce((sum, item) => sum + (item.section.weight || 1), 0) || 1;
    const satisfied = contenders.filter(
      (item) => item.need <= (pool * (item.section.weight || 1)) / weight,
    );
    if (!satisfied.length) {
      contenders.forEach((item) => {
        item.allowance = Math.floor((pool * (item.section.weight || 1)) / weight);
      });
      settled.push(...contenders);
      break;
    }
    satisfied.forEach((item) => {
      item.allowance = item.need;
      pool -= item.need;
      settled.push(item);
    });
    contenders = contenders.filter((item) => !satisfied.includes(item));
  }

  const bodyFor = (section) => {
    if (section.required) return section.body;
    const item = settled.find((entry) => entry.section === section);
    return trimLines(section.body, Math.max(0, (item?.allowance || 0) - overhead(section)));
  };

  return active
    .map((section) => ({ section, body: bodyFor(section) }))
    .filter((item) => item.body)
    .map((item) => `${item.section.label}\n${item.body}`)
    .join('\n\n');
};
