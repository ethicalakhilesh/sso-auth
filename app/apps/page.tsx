import { listClients } from "@/lib/airtable";
import { AppsManager } from "./apps-manager";

// Without this, Next.js has no signal that this page depends on live data
// and tries to prerender it statically at build time — which means every
// `next build` would call out to Airtable, and a transient Airtable issue
// (or, as caught here, invalid build-time credentials) would fail the
// build entirely rather than just this page's runtime request.
export const dynamic = "force-dynamic";

export default async function AppsPage() {
  const clients = await listClients();
  return <AppsManager initialClients={clients} />;
}
