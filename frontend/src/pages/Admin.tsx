import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api, toApiError, type ApiError } from '../lib/api';
import { TIME_SLOTS, todayISO, formatDateLong, formatTime } from '../lib/time';
import { useAuth } from '../lib/auth';
import { usePageMeta } from '../hooks/usePageMeta';
import { useRestaurant } from '../lib/restaurant';
import { useToast } from '../lib/toast';
import type { Reservation, Table } from '../lib/types';

export function Admin() {
  const { name } = useRestaurant();
  usePageMeta(`Admin · ${name}`);
  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const [tables, setTables] = useState<Table[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'cancelled'>('all');
  const [dateFilter, setDateFilter] = useState('');

  // Table edit capacity & delete
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editCapacity, setEditCapacity] = useState('');

  // New table form
  const [newNumber, setNewNumber] = useState('');
  const [newCapacity, setNewCapacity] = useState('2');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, r] = await Promise.all([
        api.get<{ tables: Table[] }>('/admin/tables'),
        api.get<{ reservations: Reservation[] }>(
          '/admin/reservations' + (dateFilter ? `?date=${dateFilter}` : '')
        ),
      ]);
      setTables(t.data.tables);
      setReservations(r.data.reservations);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function onCreateTable(e: FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const t = await api.post<{ table: Table }>('/admin/tables', {
        tableNumber: Number(newNumber),
        capacity: Number(newCapacity),
      });
      setTables((prev) => [...prev, t.data.table].sort((a, b) => a.tableNumber - b.tableNumber));
      setNewNumber('');
      setNewCapacity('2');
      showSuccess(`Table ${t.data.table.tableNumber} added successfully.`);
    } catch (err) {
      const apiErr = toApiError(err) as ApiError;
      setCreateError(apiErr.message);
      showError(apiErr.message);
    } finally {
      setCreating(false);
    }
  }

  async function onDeleteTable(id: string) {
    if (!confirm('Are you sure you want to delete this table?')) return;
    setError(null);
    try {
      await api.delete(`/admin/tables/${id}`);
      setTables((prev) => prev.filter((t) => t._id !== id));
      showSuccess('Table deleted successfully.');
    } catch (err) {
      showError(toApiError(err).message);
    }
  }

  async function onEditTableCapacity(id: string, capacity: number) {
    setError(null);
    try {
      const res = await api.patch<{ table: Table }>(`/admin/tables/${id}`, { capacity });
      setTables((prev) => prev.map((t) => (t._id === id ? res.data.table : t)));
      setEditingTableId(null);
      showSuccess(`Table ${res.data.table.tableNumber} capacity updated to ${capacity}.`);
    } catch (err) {
      showError(toApiError(err).message);
    }
  }

  async function onPatch(r: Reservation, patch: Partial<Pick<Reservation, 'status' | 'guests' | 'timeSlot'>>) {
    setError(null);
    try {
      const res = await api.patch<{ reservation: Reservation }>(`/admin/reservations/${r._id}`, patch);
      setReservations((prev) => prev.map((x) => (x._id === r._id ? res.data.reservation : x)));
      showSuccess('Reservation updated successfully.');
    } catch (err) {
      showError(toApiError(err).message);
    }
  }

  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      return true;
    });
  }, [reservations, statusFilter]);

  return (
    <main className="min-h-screen pt-24 pb-24 px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <p className="field-label text-gold-400">Admin · {user?.name}</p>
          <h1 className="mt-2 font-display text-4xl tracking-tightest font-semibold">
            Operations
          </h1>
          <p className="mt-2 text-sm text-bone-300">
            The room, in one place. Read-only public; destructive actions are scoped to admins.
          </p>
        </header>

        {error && (
          <p
            role="alert"
            className="mb-6 rounded-md border border-warn-500/40 bg-warn-500/10 px-3 py-2 text-sm text-warn-500"
          >
            {error}
          </p>
        )}

        <section className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Tables card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-gold-400/20 bg-ink-800 p-6 backdrop-blur-md shadow-2xl shadow-black/40"
          >
            <h2 className="font-display text-xl tracking-tightest font-semibold">Tables</h2>
            <p className="mt-1 text-sm text-bone-300">Add a table to make it bookable.</p>
            <ul className="mt-4 divide-y divide-bone-200/5">
              {tables.length === 0 && !loading && (
                <li className="py-3 text-sm text-bone-300">No tables yet.</li>
              )}
              {tables.map((t) => {
                const isEditing = editingTableId === t._id;
                return (
                  <li key={t._id} className="flex items-center justify-between py-3 text-sm gap-2">
                    <span className="font-mono text-bone-200">Table {t.tableNumber}</span>
                    <div className="flex items-center gap-3">
                      {isEditing ? (
                        <>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-bone-300">Seats:</span>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={editCapacity}
                              onChange={(e) => setEditCapacity(e.target.value)}
                              className="field-input w-16 py-1 px-2 text-xs"
                              required
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => onEditTableCapacity(t._id, Number(editCapacity))}
                            className="text-xs text-gold-300 hover:text-gold-100 underline"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTableId(null)}
                            className="text-xs text-bone-300 hover:text-bone-100"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-bone-300">Seats {t.capacity}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTableId(t._id);
                              setEditCapacity(String(t.capacity));
                            }}
                            className="text-xs text-gold-300 hover:text-gold-100 underline ml-2"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTable(t._id)}
                            className="text-xs text-warn-500 hover:text-warn-400 hover:underline"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <form onSubmit={onCreateTable} className="mt-6 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="field-label">Number</span>
                <input
                  data-cursor-hover
                  type="number"
                  min={1}
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  className="field-input mt-2"
                  required
                />
              </label>
              <label className="block">
                <span className="field-label">Capacity</span>
                <input
                  data-cursor-hover
                  type="number"
                  min={1}
                  max={20}
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(e.target.value)}
                  className="field-input mt-2"
                  required
                />
              </label>
              {createError && (
                <p className="col-span-2 text-sm text-warn-500">{createError}</p>
              )}
              <button
                type="submit"
                data-cursor-hover
                disabled={creating}
                className="btn-primary col-span-2"
              >
                {creating ? 'Adding…' : 'Add table'}
              </button>
            </form>
          </motion.div>

          {/* Stats card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-gold-400/20 bg-ink-800 p-6 backdrop-blur-md shadow-2xl shadow-black/40"
          >
            <h2 className="font-display text-xl tracking-tightest font-semibold">Today</h2>
            <p className="mt-1 text-sm text-bone-300">{formatDateLong(todayISO())}</p>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <Stat
                label="Total today"
                value={reservations.filter((r) => r.date === todayISO()).length}
              />
              <Stat
                label="Confirmed"
                value={
                  reservations.filter(
                    (r) => r.date === todayISO() && r.status === 'confirmed'
                  ).length
                }
              />
              <Stat
                label="Covers"
                value={reservations
                  .filter((r) => r.date === todayISO() && r.status === 'confirmed')
                  .reduce((s, r) => s + r.guests, 0)}
              />
            </div>
          </motion.div>
        </section>

        <section className="mt-12">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-xl tracking-tightest font-semibold">
              Reservations
            </h2>
            <div className="flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="field-label">Filter date</span>
                <input
                  data-cursor-hover
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="field-input mt-2"
                />
              </label>
              <label className="block">
                <span className="field-label">Status</span>
                <select
                  data-cursor-hover
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'confirmed' | 'cancelled')}
                  className="field-input mt-2"
                >
                  <option value="all">All</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              <button
                type="button"
                data-cursor-hover
                onClick={() => {
                  setDateFilter('');
                  setStatusFilter('all');
                }}
                className="btn-ghost px-4 py-2 text-xs"
              >
                Reset
              </button>
            </div>
          </div>

          {loading ? (
            <SkeletonTable />
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-bone-200/15 bg-ink-800/30 p-10 text-center">
              <p className="font-display text-lg tracking-tightest">No reservations</p>
              <p className="mt-2 text-sm text-bone-300">
                Nothing matches this filter — try a different date or status.
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${dateFilter}-${statusFilter}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden rounded-xl border border-bone-200/10 bg-ink-800/40"
              >
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-[0.18em] text-bone-300 font-mono">
                        <Th>Guest</Th>
                        <Th>Date</Th>
                        <Th>Time</Th>
                        <Th>Table</Th>
                        <Th>Party</Th>
                        <Th>Status</Th>
                        <Th>Actions</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r, i) => (
                        <Row
                          key={r._id}
                          r={r}
                          index={i}
                          onPatch={onPatch}
                          onAfterChange={load}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </section>
      </div>
    </main>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={'px-4 py-3 font-medium ' + className}>{children}</th>;
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={'px-4 py-3 align-middle ' + className}>{children}</td>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-bone-200/10 bg-ink-700/40 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-bone-300 font-mono">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
    </div>
  );
}

function Row({
  r,
  index,
  onPatch,
  onAfterChange,
}: {
  r: Reservation;
  index: number;
  onPatch: (r: Reservation, p: Partial<Pick<Reservation, 'status' | 'guests' | 'timeSlot'>>) => void;
  onAfterChange: () => void;
}) {
  const userObj = typeof r.user === 'object' ? r.user : null;
  const tableObj = typeof r.table === 'object' ? r.table : null;
  const [editing, setEditing] = useState(false);
  const [guests, setGuests] = useState(String(r.guests));
  const [timeSlot, setTimeSlot] = useState(r.timeSlot);

  return (
    <motion.tr
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 8) * 0.03, duration: 0.35 } }}
      className="border-t border-bone-200/5 hover:bg-bone-50/[0.02] transition-colors"
    >
      <Td>
        <div className="font-medium text-bone-50">
          {userObj?.name || '—'}
        </div>
        <div className="text-xs text-bone-300">{userObj?.email}</div>
      </Td>
      <Td className="font-mono text-bone-200">{r.date}</Td>
      <Td>
        {editing ? (
          <select
            data-cursor-hover
            value={timeSlot}
            onChange={(e) => setTimeSlot(e.target.value)}
            className="field-input py-1 text-xs"
          >
            {TIME_SLOTS.map((t) => (
              <option key={t} value={t}>
                {formatTime(t)}
              </option>
            ))}
          </select>
        ) : (
          <span className="font-mono text-bone-200">{formatTime(r.timeSlot)}</span>
        )}
      </Td>
      <Td className="font-mono text-bone-200">
        {tableObj ? `Table ${tableObj.tableNumber}` : '—'}
      </Td>
      <Td>
        {editing ? (
          <input
            data-cursor-hover
            type="number"
            min={1}
            max={20}
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            className="field-input w-20 py-1 text-xs"
          />
        ) : (
          <span>{r.guests}</span>
        )}
      </Td>
      <Td>
        <span
          className={
            'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-mono ' +
            (r.status === 'cancelled'
              ? 'border border-bone-200/20 text-bone-300'
              : 'border border-gold-400/40 text-gold-300')
          }
        >
          <span
            className={'h-1.5 w-1.5 rounded-full ' +
              (r.status === 'cancelled' ? 'bg-bone-300' : 'bg-gold-400')}
          />
          {r.status}
        </span>
      </Td>
      <Td>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                type="button"
                data-cursor-hover
                onClick={async () => {
                  await onPatch(r, { guests: Number(guests), timeSlot });
                  setEditing(false);
                  onAfterChange();
                }}
                className="btn-ghost px-3 py-1.5 text-xs"
              >
                Save
              </button>
              <button
                type="button"
                data-cursor-hover
                onClick={() => {
                  setEditing(false);
                  setGuests(String(r.guests));
                  setTimeSlot(r.timeSlot);
                }}
                className="text-xs text-bone-300 hover:text-bone-50"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                data-cursor-hover
                onClick={() => setEditing(true)}
                className="btn-ghost px-3 py-1.5 text-xs"
              >
                Edit
              </button>
              {r.status === 'confirmed' ? (
                <button
                  type="button"
                  data-cursor-hover
                  onClick={() => onPatch(r, { status: 'cancelled' })}
                  className="text-xs text-warn-500 hover:underline"
                >
                  Cancel
                </button>
              ) : (
                <button
                  type="button"
                  data-cursor-hover
                  onClick={() => onPatch(r, { status: 'confirmed' })}
                  className="text-xs text-gold-300 hover:underline"
                >
                  Restore
                </button>
              )}
            </>
          )}
        </div>
      </Td>
    </motion.tr>
  );
}

function SkeletonTable() {
  return (
    <div className="overflow-hidden rounded-xl border border-bone-200/10 bg-ink-800/40">
      <div className="p-6 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-5 bg-ink-700 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}
