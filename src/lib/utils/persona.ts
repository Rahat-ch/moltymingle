const DEFAULT_MAX_TRAITS = 10;

export function parsePersonaTraits(value: unknown, maxTraits: number = DEFAULT_MAX_TRAITS): string[] {
  const normalizedMax = Number.isFinite(maxTraits) && maxTraits > 0 ? Math.floor(maxTraits) : DEFAULT_MAX_TRAITS;
  let raw: unknown = value;

  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((trait) => (typeof trait === 'string' ? trait.trim() : ''))
    .filter((trait) => trait.length > 0)
    .slice(0, normalizedMax);
}

export function sanitizeAnswers(value: unknown, maxAnswers: number = 10, maxLength: number = 280): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const limit = Number.isFinite(maxAnswers) && maxAnswers > 0 ? Math.floor(maxAnswers) : 10;

  return value
    .map((answer) => (typeof answer === 'string' ? answer.trim() : ''))
    .filter((answer) => answer.length > 0)
    .map((answer) => (answer.length > maxLength ? answer.slice(0, maxLength) : answer))
    .slice(0, limit);
}

export function normalizeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (Number.isFinite(maxLength) && maxLength > 0 && trimmed.length > maxLength) {
    return trimmed.slice(0, maxLength);
  }

  return trimmed;
}
