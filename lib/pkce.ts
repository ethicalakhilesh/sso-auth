/**
 * Verifies a PKCE code_verifier against the code_challenge stored with the
 * authorization code. Only S256 is supported — the "plain" method exists in
 * the spec but offers no real protection, so it's rejected outright.
 *
 * Uses Web Crypto (crypto.subtle), available in both the Node and Edge
 * runtimes, so this stays portable if it's ever needed outside a Node-only
 * API route.
 */
export async function verifyPkce(
  codeVerifier: string,
  codeChallenge: string,
  codeChallengeMethod: string
): Promise<boolean> {
  if (codeChallengeMethod !== "S256") return false;
  if (!codeVerifier || !codeChallenge) return false;

  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(codeVerifier)
  );
  const computed = base64UrlEncode(new Uint8Array(digest));

  return computed === codeChallenge;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
