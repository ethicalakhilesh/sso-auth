/**
 * clientId: kept simple and predictable since it ends up in URLs and
 * Airtable formulas — lowercase letters, numbers, and hyphens only.
 */
export function isValidClientId(value: string): boolean {
  return /^[a-z0-9-]{2,50}$/.test(value);
}

/**
 * Parses a comma-separated redirect_uri list and validates each entry is
 * an absolute, well-formed URL. Returns null if anything is invalid,
 * rather than silently dropping bad entries — a client registered with
 * a URI that got silently dropped would fail confusingly later instead
 * of failing clearly now.
 */
export function parseRedirectUris(raw: string): string[] | null {
  const entries = raw
    .split(",")
    .map((uri) => uri.trim())
    .filter(Boolean);

  if (entries.length === 0) return null;

  for (const entry of entries) {
    try {
      // eslint-disable-next-line no-new
      new URL(entry);
    } catch {
      return null;
    }
  }

  return entries;
}

/**
 * launchUrl is security-sensitive (Finding 6): the dashboard navigates the
 * logged-in user's browser straight to this URL, so an attacker-controlled
 * value here would turn the dashboard into an open-redirect/phishing
 * vector. Only https: is allowed, except localhost/127.0.0.1 over http:
 * for local development — dangerous schemes like javascript:/data:/vbscript:
 * are rejected simply by not being in that allow-list.
 */
export function isValidLaunchUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol === "https:") return true;

  if (
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1")
  ) {
    return true;
  }

  return false;
}
