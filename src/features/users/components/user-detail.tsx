import { StatusPill } from "@/components/sb/status-pill";
import { formatDateTime, formatMonthYear, formatShortDate } from "@/lib/format/date";
import { formatLkr } from "@/lib/format/money";
import type { UserDetail as Detail } from "../map";
import { UserActions } from "./user-actions";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-input border border-line bg-soft p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-text">{value}</dd>
    </div>
  );
}

const th = "px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground";

export function UserDetail({ user, canSuspend }: { user: Detail; canSuspend: boolean }) {
  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-card border border-line bg-surface p-6 shadow-card" aria-labelledby="user-title">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 id="user-title" className="text-2xl font-semibold text-text">
                {user.name}
              </h2>
              <StatusPill status={user.status} />
            </div>
            <p className="mt-1 text-muted-foreground">
              {user.roleLabel} · Joined {formatMonthYear(user.joinedAt)}
            </p>
            <p className="mt-1 font-mono text-xs text-text-2">
              {[user.emailMasked, user.phoneMasked].filter(Boolean).join(" · ") || "No contact details"}
            </p>
          </div>
          {canSuspend && user.canAct && <UserActions id={user.id} name={user.name} status={user.status} />}
        </header>
        {user.status === "suspended" && (
          <p className="rounded-input border border-danger/30 bg-danger-bg p-3 text-sm text-danger">
            Suspended{user.suspendedAt ? ` on ${formatDateTime(user.suspendedAt)}` : ""}
            {user.suspendReason ? ` · Reason: ${user.suspendReason}` : ""}
          </p>
        )}
        <dl className="grid grid-cols-3 gap-3">
          <Stat label="Bookings" value={user.bookings} />
          <Stat label="Orders" value={user.orders} />
          <Stat label="Total spend" value={formatLkr(user.totalSpendCents)} />
          <Stat label="Disputes" value={user.disputes} />
          <Stat label="Reviews" value={user.reviews} />
          <Stat label="Favourite salons" value={user.favourites} />
        </dl>
        {user.lastBookingAt && <p className="text-sm text-muted-foreground">Last booking {formatDateTime(user.lastBookingAt)}</p>}
      </section>

      {user.salons.length > 0 && (
        <section aria-labelledby="owned" className="rounded-card border border-line bg-surface p-6 shadow-card">
          <h3 id="owned" className="font-semibold text-text">
            Salons owned
          </h3>
          <ul className="mt-3 space-y-2">
            {user.salons.map((s) => (
              <li key={s.id} className="flex items-center justify-between text-sm">
                <span className="text-text">{s.name}</span>
                <StatusPill status={s.is_active ? "active" : "suspended"} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="bookings" className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
        <h3 id="bookings" className="px-6 pt-5 font-semibold text-text">
          Recent bookings
        </h3>
        {user.recentBookings.length === 0 ? (
          <p className="px-6 py-4 text-sm text-muted-foreground">No bookings yet</p>
        ) : (
          <table aria-label="Recent bookings" className="mt-2 w-full text-sm">
            <thead>
              <tr>
                {["Reference", "Salon", "Status", "Date"].map((h) => (
                  <th key={h} className={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {user.recentBookings.map((b) => (
                <tr key={b.id} className="border-t border-line">
                  <td className="px-4 py-2 font-mono text-xs">{b.reference_code ?? "-"}</td>
                  <td className="px-4 py-2">{b.salon_name}</td>
                  <td className="px-4 py-2">
                    <StatusPill status={b.status} />
                  </td>
                  <td className="px-4 py-2">{formatShortDate(b.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section aria-labelledby="orders" className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
        <h3 id="orders" className="px-6 pt-5 font-semibold text-text">
          Recent orders
        </h3>
        {user.recentOrders.length === 0 ? (
          <p className="px-6 py-4 text-sm text-muted-foreground">No orders yet</p>
        ) : (
          <table aria-label="Recent orders" className="mt-2 w-full text-sm">
            <thead>
              <tr>
                {["Reference", "Salon", "Status", "Total", "Date"].map((h) => (
                  <th key={h} className={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {user.recentOrders.map((o) => (
                <tr key={o.id} className="border-t border-line">
                  <td className="px-4 py-2 font-mono text-xs">{o.reference_code ?? "-"}</td>
                  <td className="px-4 py-2">{o.salon_name}</td>
                  <td className="px-4 py-2">
                    <StatusPill status={o.status} />
                  </td>
                  <td className="px-4 py-2">{formatLkr(o.total_cents)}</td>
                  <td className="px-4 py-2">{formatShortDate(o.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
