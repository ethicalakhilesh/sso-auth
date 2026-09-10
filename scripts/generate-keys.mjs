/**
 * One-off: generates the ES256 keypair used to sign/verify ID tokens.
 * Usage: node scripts/generate-keys.mjs
 *
 * Paste the two output blocks into your .env (and Vercel env vars) as
 * AUTH_PRIVATE_KEY and AUTH_PUBLIC_KEY. Keep the private key secret;
 * the public key is safe to share (it'll be published via JWKS in Phase 2).
 */
import { generateKeyPair, exportPKCS8, exportSPKI } from "jose";

const { privateKey, publicKey } = await generateKeyPair("ES256", {
  extractable: true,
});

const privatePem = await exportPKCS8(privateKey);
const publicPem = await exportSPKI(publicKey);

console.log("Add these to your .env (and Vercel env vars):\n");
console.log(`AUTH_PRIVATE_KEY="${privatePem.trim()}"\n`);
console.log(`AUTH_PUBLIC_KEY="${publicPem.trim()}"\n`);
