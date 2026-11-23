// Pure helpers for the ?debug log buffer. No DOM access so they are unit-testable
// under node and reusable in the browser (attached to window).
(function (root) {
  // Keep entries that (a) have a numeric ts, (b) are newer than maxAgeMs, then
  // keep only the newest maxEntries. Never throws.
  function pruneDebugLogs(logs, now, maxAgeMs, maxEntries) {
    if (!Array.isArray(logs)) return [];
    const cutoff = now - maxAgeMs;
    let kept = logs.filter(e => e && typeof e.ts === 'number' && e.ts >= cutoff);
    if (kept.length > maxEntries) kept = kept.slice(kept.length - maxEntries);
    return kept;
  }

  const api = { pruneDebugLogs };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TaadaDebugLogUtils = api;
})(typeof window !== 'undefined' ? window : globalThis);
