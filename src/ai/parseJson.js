const CLOSERS = { '{': '}', '[': ']' };

/**
 * Rebuilds parseable JSON from output that stopped mid-value, which happens
 * whenever a model hits its token limit partway through the array.
 * Rewinds to the last complete element, then closes whatever is still open.
 * @param {string} text - Candidate JSON starting at its opening brace
 * @returns {string|null} Balanced JSON, or null if nothing was salvageable
 */
const closeTruncated = (text) => {
  const stack = [];
  let inString = false;
  let escaped = false;
  let safeEnd = -1;
  let safeStack = '';

  // A complete element ends just before a separating comma, or just after a
  // nested object/array closes. Snapshot the open containers at that moment,
  // since later characters may push more that never got closed.
  const mark = (end) => {
    safeEnd = end;
    safeStack = stack.join('');
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === '{' || char === '[') {
      stack.push(char);
    } else if (char === '}' || char === ']') {
      stack.pop();
      if (stack.length) mark(index + 1);
    } else if (char === ',' && stack.length) {
      mark(index);
    }
  }

  if (safeEnd < 0 || !safeStack) return null;

  const tail = [...safeStack].reverse().map((open) => CLOSERS[open]).join('');
  return text.slice(0, safeEnd) + tail;
};

export const extractJson = (text) => {
  if (!text || typeof text !== 'string') {
    throw new Error('Empty model response');
  }

  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/i, '').replace(/```$/u, '').trim();
  }

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  const candidates = [cleaned];

  if (start >= 0 && end > start) {
    candidates.push(cleaned.slice(start, end + 1));
  }
  if (start >= 0) {
    const repaired = closeTruncated(cleaned.slice(start));
    if (repaired) candidates.push(repaired);
  }

  let lastError = null;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  console.error('Could not parse model response:', lastError?.message, cleaned.slice(0, 500));
  throw new Error('Model returned invalid JSON. The response may have been cut short — try again.');
};
