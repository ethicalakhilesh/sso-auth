import { cookies } from "next/headers";
import Link from "next/link";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import {
  findUserByUsername,
  listClients,
  listAssignmentsForUser,
  listRecentSessions,
} from "@/lib/airtable";
import { LogoutButton } from "./logout-button";

export const dynamic = "force-dynamic";

const HISTORY_LIMIT = 7;

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  const user = session
    ? await findUserByUsername(session.preferred_username)
    : null;

  if (!session || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 nova-page">
        <p className="text-slate-500">Not signed in.</p>
      </main>
    );
  }

  const displayName =
    user.firstName || user.lastName
      ? [user.firstName, user.lastName].filter(Boolean).join(" ")
      : session.preferred_username;

  const allClients = await listClients();
  const history = await listRecentSessions(
    session.preferred_username,
    HISTORY_LIMIT
  );

  let visibleClients = allClients;
  if (user.role !== "admin") {
    const assignments = await listAssignmentsForUser(user.id);
    const assignedClientIds = new Set(assignments.map((a) => a.clientId));
    visibleClients = allClients.filter((client) =>
      assignedClientIds.has(client.clientId)
    );
  }

  const deviceNames = Array.from(
    new Set(history.map((entry) => entry.device).filter(Boolean))
  ).slice(0, 3);

  return (
    <main className="min-h-screen nova-page">
      <div className="nova-shell">
        <aside className="nova-sidebar">
          <div>
            <div className="nova-brand">
              <div className="nova-logo"><NovaMark /></div>
              <div>
                <div className="nova-brand-name">NOVA</div>
                <div className="nova-brand-sub">SSO</div>
              </div>
            </div>

            <nav className="nova-nav" aria-label="Main navigation">
              <a href="#top" className="nova-nav-item active"><HomeIcon /> Home</a>
              <a href="#apps" className="nova-nav-item"><GridIcon /> My Apps</a>
              <a href="#activity" className="nova-nav-item"><ActivityIcon /> Activity</a>
              <a href="#security" className="nova-nav-item"><ShieldIcon /> Security</a>
              {user.role === "admin" && (
                <>
                  <Link href="/apps" className="nova-nav-item"><BoxIcon /> Manage Apps <span className="admin-badge">Admin</span></Link>
                  <Link href="/users" className="nova-nav-item"><UsersIcon /> Manage Users <span className="admin-badge">Admin</span></Link>
                </>
              )}
              <Link href="/settings" className="nova-nav-item"><SettingsIcon /> Settings</Link>
            </nav>
          </div>

          <div className="nova-sidebar-bottom">
            <a href="#help" className="nova-nav-item"><HelpIcon /> Help</a>
            <div className="nova-account-mini">
              <div className="avatar">{initials(displayName)}</div>
              <div className="min-w-0">
                <div className="account-name truncate">{displayName}</div>
                <div className="account-email truncate">{user.username}</div>
              </div>
              <span className="account-dots">•••</span>
            </div>
            <div className="nova-version">
              NOVA SSO v1.0.0<br />
              Built for a more connected world.
            </div>
          </div>
        </aside>

        <section className="nova-content" id="top">
          <header className="nova-topbar">
            <div className="nova-search">
              <SearchIcon />
              <span>Search for apps, users, or settings...</span>
              <kbd>⌘ K</kbd>
            </div>
            <div className="nova-top-actions">
              <button className="icon-button" aria-label="Notifications">
                <BellIcon />
                <span className="notification-dot" />
              </button>
              <div className="avatar avatar-top">{initials(displayName)}</div>
            </div>
          </header>

          <div className="nova-main">
            <div className="nova-heading-row">
              <div>
                <p className="eyebrow">IDENTITY FOR WHAT&apos;S NEXT</p>
                <h1>Good morning, {displayName}</h1>
                <p className="nova-subtitle">
                  Access your applications or manage the SSO system.
                </p>
              </div>
              <div className="nova-date">
                <strong>{formatToday()}</strong>
                <span>Secure access, simplified.</span>
              </div>
            </div>

            <section className="nova-stats">
              <StatCard icon={<GridIcon />} value={String(visibleClients.length)} label="Assigned Apps" note={user.role === "admin" ? "All registered apps" : "Available to you"} />
              <StatCard icon={<ActivityIcon />} value={String(history.length)} label="Recent Sign-ins" note="Latest activity" />
              <StatCard icon={<ShieldIcon />} value={user.role === "admin" ? "Admin" : "User"} label="Account Role" note="Access level" />
              <StatCard icon={<KeyIcon />} value="Secure" label="SSO Status" note="Session protected" />
            </section>

            <div className="nova-grid-main">
              <div className="nova-left-column">
                <section className="nova-panel" id="apps">
                  <div className="panel-heading">
                    <div>
                      <h2>Your Applications</h2>
                      <p>Launch the applications assigned to you.</p>
                    </div>
                    {user.role === "admin" && (
                      <Link href="/apps" className="view-link">Manage all <ArrowIcon /></Link>
                    )}
                  </div>

                  {visibleClients.length === 0 ? (
                    <div className="empty-state">
                      {user.role === "admin"
                        ? "No apps registered yet."
                        : "No apps have been assigned to you yet."}
                    </div>
                  ) : (
                    <div className="app-grid">
                      {visibleClients.map((client) => (
                        <a key={client.id} href={client.launchUrl} className="app-card">
                          <div className="app-card-top">
                            <div className="app-icon"><AppIcon name={client.name} /></div>
                            <span className="star">☆</span>
                          </div>
                          <h3>{client.name}</h3>
                          <p>{client.clientId}</p>
                          <div className="app-open">Open App <ExternalIcon /></div>
                        </a>
                      ))}
                    </div>
                  )}
                </section>

                <section className="nova-panel" id="activity">
                  <div className="panel-heading">
                    <div>
                      <h2>Recent Activity</h2>
                      <p>Your latest sign-in history.</p>
                    </div>
                    <Link href="/settings" className="view-link">View all <ArrowIcon /></Link>
                  </div>

                  {history.length === 0 ? (
                    <div className="empty-state">
                      No sign-in history yet — it will appear after your next login.
                    </div>
                  ) : (
                    <div className="activity-list">
                      {history.slice(0, 5).map((entry, index) => (
                        <div className="activity-row" key={`${entry.loginAt}-${index}`}>
                          <div className="activity-icon"><DeviceIcon /></div>
                          <div className="activity-copy">
                            <strong>Signed in</strong>
                            <span>{entry.device || entry.userAgent || "Unknown device"}</span>
                          </div>
                          <div className="activity-time">{formatDate(entry.loginAt)}</div>
                          <span className="status-dot" />
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <div className="nova-right-column">
                <section className="nova-panel profile-panel">
                  <div className="panel-heading">
                    <h2>Profile</h2>
                    <Link href="/settings" className="small-button">Settings</Link>
                  </div>
                  <div className="profile-card">
                    <div className="avatar avatar-large">{initials(displayName)}</div>
                    <div className="profile-copy">
                      <strong>{displayName}</strong>
                      <span>{user.username}</span>
                      <span>{user.role === "admin" ? "Administrator" : "User"}</span>
                    </div>
                    <span className="active-pill"><span /> Active</span>
                  </div>
                  <div className="profile-meta">
                    <div>
                      <span>Last sign in</span>
                      <strong>{history[0] ? formatDate(history[0].loginAt) : "No history"}</strong>
                    </div>
                    <div>
                      <span>Device</span>
                      <strong>{history[0]?.device || "Unknown device"}</strong>
                    </div>
                  </div>
                </section>

                <section className="nova-panel" id="security">
                  <div className="panel-heading">
                    <div>
                      <h2>Security</h2>
                      <p>Account protection and access.</p>
                    </div>
                    <ShieldIcon />
                  </div>
                  <div className="security-list">
                    <Link href="/settings" className="security-row">
                      <span className="security-icon"><LockIcon /></span>
                      <span><strong>Password</strong><small>Manage your password</small></span>
                      <ChevronIcon />
                    </Link>
                    <div className="security-row">
                      <span className="security-icon"><KeyIcon /></span>
                      <span><strong>Protected Session</strong><small>Signed session cookie</small></span>
                      <span className="secure-pill">Secure</span>
                    </div>
                    <div className="security-row">
                      <span className="security-icon"><ShieldIcon /></span>
                      <span><strong>Role-based access</strong><small>{user.role === "admin" ? "Administrator permissions" : "Assigned apps only"}</small></span>
                      <span className="secure-pill">On</span>
                    </div>
                  </div>
                </section>

                <section className="nova-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Recent Devices</h2>
                      <p>Devices seen in your sign-in history.</p>
                    </div>
                    <DeviceIcon />
                  </div>
                  {deviceNames.length === 0 ? (
                    <div className="empty-state compact">No devices recorded yet.</div>
                  ) : (
                    <div className="device-list">
                      {deviceNames.map((device) => (
                        <div className="device-row" key={device}>
                          <div className="activity-icon"><DeviceIcon /></div>
                          <div>
                            <strong>{device}</strong>
                            <span>Seen in recent sign-in history</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>

            <footer className="nova-footer">
              <span>NOVA SSO v1.0.0 · Secure identity for connected applications.</span>
              <div>
                <Link href="/settings">Privacy</Link><span>•</span>
                <Link href="/settings">Security</Link><span>•</span>
                <a href="#help">Help</a>
                <LogoutButton />
              </div>
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U";
}
function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return iso;
  }
}
function formatToday() {
  return new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}
function StatCard({ icon, value, label, note }: { icon: React.ReactNode; value: string; label: string; note: string }) {
  return <div className="stat-card"><div className="stat-icon">{icon}</div><div><strong>{value}</strong><span>{label}</span><small>{note}</small></div></div>;
}
function AppIcon({ name }: { name: string }) {
  return <span className="app-letter">{name.trim().charAt(0).toUpperCase() || "A"}</span>;
}
function NovaMark() {
  return <svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="12" fill="none" stroke="currentColor" strokeWidth="3"/><circle cx="20" cy="20" r="5" fill="currentColor"/><path d="M20 2v7M20 31v7M2 20h7M31 20h7M7.3 7.3l5 5M27.7 27.7l5 5M32.7 7.3l-5 5M12.3 27.7l-5 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>;
}
function Icon({ children }: { children: React.ReactNode }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}
function HomeIcon() { return <Icon><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/></Icon>; }
function GridIcon() { return <Icon><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></Icon>; }
function ActivityIcon() { return <Icon><path d="M4 12h4l2-7 4 14 2-7h4"/></Icon>; }
function ShieldIcon() { return <Icon><path d="M12 3 20 6v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3Z"/><path d="m9 12 2 2 4-4"/></Icon>; }
function BoxIcon() { return <Icon><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/></Icon>; }
function UsersIcon() { return <Icon><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M17 5.5a3 3 0 0 1 0 5.8M17 14c2.5.3 4 2.3 4 5"/></Icon>; }
function SettingsIcon() { return <Icon><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V20h-2.6v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8 15a1.7 1.7 0 0 0-1.6-1H6v-2.6h.4A1.7 1.7 0 0 0 8 10a1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V5h2.6v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.4V14h-.4a1.7 1.7 0 0 0-1.6 1Z"/></Icon>; }
function SearchIcon() { return <Icon><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></Icon>; }
function BellIcon() { return <Icon><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></Icon>; }
function HelpIcon() { return <Icon><circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.5 2.5 0 1 1 4.3 1.7c-1.2 1.1-2 1.5-2 3M12 17h.01"/></Icon>; }
function ArrowIcon() { return <Icon><path d="M5 12h13M13 6l6 6-6 6"/></Icon>; }
function ExternalIcon() { return <Icon><path d="M14 5h5v5M19 5l-8 8"/><path d="M18 13v5H5V5h5"/></Icon>; }
function DeviceIcon() { return <Icon><rect x="3" y="5" width="18" height="13" rx="2"/><path d="M8 21h8M12 18v3"/></Icon>; }
function KeyIcon() { return <Icon><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M16 7l2 2M14 9l2 2"/></Icon>; }
function LockIcon() { return <Icon><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></Icon>; }
function ChevronIcon() { return <Icon><path d="m9 18 6-6-6-6"/></Icon>; }
