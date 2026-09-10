import { NextResponse } from "next/server";
import { getPublicJwk } from "@/lib/auth";

/**
 * Publishes the public key used to verify ID tokens. Any client can fetch
 * this to check a token's signature without ever holding a shared secret —
 * this is what makes ES256 (asymmetric) signing worth the extra setup over
 * the old shared-HMAC-secret approach.
 */
export async function GET() {
  const jwk = await getPublicJwk();

  return NextResponse.json(
    { keys: [jwk] },
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
}
