export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+#. ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeWhitespace(value: string): string {
  return value
    .replace(/\ufb00/g, "ff")
    .replace(/\ufb01/g, "fi")
    .replace(/\ufb02/g, "fl")
    .replace(/\ufb03/g, "ffi")
    .replace(/\ufb04/g, "ffl")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    const clean = normalizeWhitespace(value);
    const key = normalizeText(clean);
    if (!clean || seen.has(key)) return;
    seen.add(key);
    result.push(clean);
  });
  return result;
}

export function containsPhrase(source: string, phrase: string): boolean {
  const normalizedSource = ` ${normalizeText(source)} `;
  const normalizedPhrase = normalizeText(phrase);
  if (!normalizedPhrase) return false;
  return normalizedSource.includes(` ${normalizedPhrase} `) || normalizedSource.includes(normalizedPhrase);
}

export function phraseCount(source: string, phrases: string[]): number {
  const normalized = normalizeText(source);
  return phrases.reduce((total, phrase) => {
    const target = normalizeText(phrase);
    if (!target) return total;
    let count = 0;
    let from = 0;
    while (true) {
      const index = normalized.indexOf(target, from);
      if (index < 0) break;
      count += 1;
      from = index + target.length;
    }
    return total + count;
  }, 0);
}

export function tokenSet(value: string): Set<string> {
  return new Set(
    normalizeText(value)
      .split(" ")
      .filter((token) => token.length > 2)
  );
}

export function jaccardPercent(left: Iterable<string>, right: Iterable<string>): number {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  if (!leftSet.size && !rightSet.size) return 0;
  const overlap = [...leftSet].filter((item) => rightSet.has(item)).length;
  const union = new Set([...leftSet, ...rightSet]).size;
  return union ? Math.round((overlap / union) * 100) : 0;
}

export function sentenceLikeLines(value: string): string[] {
  return uniqueStrings(
    value
      .replace(/\r/g, "")
      .replace(/[\uf0b7\u2022\u25cf\u25aa]/g, "\n- ")
      .split(/\n+|(?<=[.!?])\s+(?=[A-Z])/)
      .map((line) => normalizeWhitespace(line.replace(/^[-*]\s*/, "")))
      .filter((line) => line.length >= 18)
  );
}

export function evidenceForPhrases(source: string, phrases: string[], limit = 3): string[] {
  const lines = sentenceLikeLines(source);
  return lines
    .filter((line) => phrases.some((phrase) => containsPhrase(line, phrase)))
    .sort((left, right) => right.length - left.length)
    .slice(0, limit)
    .map((line) => (line.length > 240 ? `${line.slice(0, 237)}...` : line));
}

export function makeId(prefix = "id"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function average(values: number[], fallback = 0): number {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : fallback;
}

export function topCounts(values: string[], limit = 8): Array<{ label: string; count: number }> {
  const counts = new Map<string, { label: string; count: number }>();
  values.forEach((value) => {
    const key = normalizeText(value);
    if (!key) return;
    const current = counts.get(key);
    counts.set(key, { label: current?.label || value, count: (current?.count || 0) + 1 });
  });
  return [...counts.values()].sort((left, right) => right.count - left.count || left.label.localeCompare(right.label)).slice(0, limit);
}
