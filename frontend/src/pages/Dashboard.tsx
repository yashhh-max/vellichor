import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api, toApiError, type ApiError } from '../lib/api';
import { TIME_SLOTS, todayISO, formatDateLong, formatTime } from '../lib/time';
import { useAuth } from '../lib/auth';
import { usePageMeta } from '../hooks/usePageMeta';
import { useRestaurant } from '../lib/restaurant';
import { useToast } from '../lib/toast';
import type { Reservation, Table } from '../lib/types';

export function Dashboard() {
  const { name } = useRestaurant();
  usePageMeta(`Dashboard · ${name}`);
  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useToast();

  const [tables, setTables] = useState<Table[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // form state
  const [tableId, setTableId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]);
  const [guests, setGuests] = useState(2);

  // Filter tab state
  const [activeTab, setActiveTab] = useState<'Upcoming' | 'Past' | 'Cancelled' | 'All'>('Upcoming');

  // Availability preview state
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, r] = await Promise.all([
        api.get<{ tables: Table[] }>('/tables'),
        api.get<{ reservations: Reservation[] }>('/reservations/me'),
      ]);
      setTables(t.data.tables);
      setReservations(r.data.reservations);
      if (!tableId && t.data.tables.length) {
        setTableId(t.data.tables[0]._id);
      }
    } catch (err) {
      showError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [tableId, showError]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch table availability on selection changes (debounced)
  useEffect(() => {
    if (!tableId || !date) {
      setBookedSlots([]);
      return;
    }

    const handler = setTimeout(async () => {
      setLoadingAvailability(true);
      try {
        const res = await api.get<{ bookedSlots: string[] }>(`/tables/${tableId}/availability?date=${date}`);
        setBookedSlots(res.data.bookedSlots);
      } catch (err) {
        console.error('Error fetching availability:', err);
      } finally {
        setLoadingAvailability(false);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [tableId, date]);

  // Adjust selected time slot if it becomes booked
  useEffect(() => {
    if (bookedSlots.includes(timeSlot)) {
      const availableSlot = TIME_SLOTS.find((slot) => !bookedSlots.includes(slot));
      if (availableSlot) {
        setTimeSlot(availableSlot);
      }
    }
  }, [bookedSlots, timeSlot]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!tableId) {
      showError('Please pick a table');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post<{ reservation: Reservation }>('/reservations', {
        tableId,
        date,
        timeSlot,
        guests,
      });
      setReservations((prev) => [res.data.reservation, ...prev]);
      showSuccess('Reservation confirmed.');
    } catch (err) {
      const apiErr: ApiError = toApiError(err);
      showError(apiErr.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function onCancel(id: string) {
    setCancellingId(id);
    try {
      const res = await api.delete<{ reservation: Reservation }>(`/reservations/${id}`);
      setReservations((prev) =>
        prev.map((r) => (r._id === id ? { ...r, status: res.data.reservation.status } : r))
      );
      showSuccess('Reservation cancelled.');
    } catch (err) {
      showError(toApiError(err).message);
    } finally {
      setCancellingId(null);
    }
  }

  // Filter client-side
  const filtered = useMemo(() => {
    const today = todayISO();
    return reservations.filter((r) => {
      if (activeTab === 'Upcoming') {
        return r.status === 'confirmed' && r.date >= today;
      }
      if (activeTab === 'Past') {
        return r.status === 'confirmed' && r.date < today;
      }
      if (activeTab === 'Cancelled') {
        return r.status === 'cancelled';
      }
      return true;
    });
  }, [reservations, activeTab]);

  // Sort: confirmed first, then cancelled; most recent first within each group.
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'confirmed' ? -1 : 1;
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.timeSlot.localeCompare(a.timeSlot);
    });
  }, [filtered]);

  return (
    <main className="min-h-screen pt-24 pb-24 px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10">
          <p className="field-label text-bone-300">Welcome back, {user?.name}</p>
          <h1 className="mt-2 font-display text-4xl tracking-tightest font-semibold">
            Your reservations
          </h1>
        </header>

        <section className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          {/* Reservation form */}
          <motion.form
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            onSubmit={onSubmit}
            className="rounded-2xl border border-bone-200/10 bg-ink-800 p-6 backdrop-blur-md shadow-2xl shadow-black/40 h-fit"
          >
            <h2 className="font-display text-xl tracking-tightest font-semibold">New reservation</h2>
            <p className="mt-1 text-sm text-bone-300">All fields are required.</p>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="field-label">Table</span>
                <select
                  data-cursor-hover
                  value={tableId}
                  onChange={(e) => setTableId(e.target.value)}
                  className="field-input mt-2"
                >
                  {tables.length === 0 && <option value="">No tables available</option>}
                  {tables.map((t) => (
                    <option key={t._id} value={t._id}>
                      Table {t.tableNumber} — seats {t.capacity}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="field-label">Date</span>
                  <input
                    data-cursor-hover
                    type="date"
                    min={todayISO()}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="field-input mt-2"
                  />
                </label>
                <label className="block">
                  <span className="field-label">Time {loadingAvailability && <span className="text-[10px] lowercase text-gold-400 font-sans ml-1">checking...</span>}</span>
                  <select
                    data-cursor-hover
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="field-input mt-2"
                  >
                    {TIME_SLOTS.map((t) => {
                      const isBooked = bookedSlots.includes(t);
                      return (
                        <option
                          key={t}
                          value={t}
                          disabled={isBooked}
                          className={isBooked ? 'text-bone-400 opacity-50 bg-ink-700' : ''}
                        >
                          {formatTime(t)}{isBooked ? ' (Booked)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="field-label">Guests</span>
                <input
                  data-cursor-hover
                  type="number"
                  min={1}
                  max={20}
                  value={guests}
                  onChange={(e) => setGuests(Math.max(1, Number(e.target.value) || 1))}
                  className="field-input mt-2"
                />
              </label>

              <button
                type="submit"
                data-cursor-hover
                disabled={submitting || !tableId}
                className="btn-primary w-full"
              >
                {submitting ? 'Reserving…' : 'Confirm reservation'}
              </button>
            </div>
          </motion.form>

          {/* Reservations list */}
          <div>
            <div className="flex border-b border-bone-200/10 mb-6 gap-6">
              {(['Upcoming', 'Past', 'Cancelled', 'All'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  data-cursor-hover
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 text-sm font-medium transition-colors relative ${
                    activeTab === tab ? 'text-gold-400 font-semibold' : 'text-bone-300 hover:text-bone-100'
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold-400"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
            {loading ? (
              <SkeletonList />
            ) : sorted.length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="space-y-3">
                <AnimatePresence initial={false}>
                  {sorted.map((r, idx) => (
                    <ReservationCard
                      key={r._id}
                      reservation={r}
                      index={idx}
                      cancelling={cancellingId === r._id}
                      onCancel={onCancel}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function ReservationCard({
  reservation,
  index,
  cancelling,
  onCancel,
}: {
  reservation: Reservation;
  index: number;
  cancelling: boolean;
  onCancel: (id: string) => void;
}) {
  const table = typeof reservation.table === 'object' ? reservation.table : null;
  const cancelled = reservation.status === 'cancelled';
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 8) * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] } }}
      exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.3 } }}
      className={
        'rounded-xl border bg-ink-800/60 backdrop-blur p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 ' +
        (cancelled ? 'border-bone-200/5 opacity-60' : 'border-bone-200/10')
      }
    >
      <div className="min-w-0">
        <p className="font-display text-lg tracking-tightest font-semibold">
          {formatDateLong(reservation.date)} · {formatTime(reservation.timeSlot)}
        </p>
        <p className="text-sm text-bone-300">
          {table ? `Table ${table.tableNumber}` : 'Table'} · {reservation.guests}{' '}
          {reservation.guests === 1 ? 'guest' : 'guests'}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={
            'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-mono ' +
            (cancelled
              ? 'border border-bone-200/20 text-bone-300'
              : 'border border-gold-400/40 text-gold-300')
          }
        >
          <span className={'h-1.5 w-1.5 rounded-full ' + (cancelled ? 'bg-bone-300' : 'bg-gold-400')} />
          {cancelled ? 'cancelled' : 'confirmed'}
        </span>
        {!cancelled && (
          <button
            type="button"
            data-cursor-hover
            disabled={cancelling}
            onClick={() => onCancel(reservation._id)}
            className="btn-ghost px-4 py-2 text-xs"
          >
            {cancelling ? 'Cancelling…' : 'Cancel'}
          </button>
        )}
      </div>
    </motion.li>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-bone-200/15 bg-ink-800/30 p-10 text-center">
      <p className="font-display text-lg tracking-tightest">No reservations yet</p>
      <p className="mt-2 text-sm text-bone-300">Use the form to make your first one.</p>
    </div>
  );
}

function SkeletonList() {
  return (
    <ul className="space-y-3">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="rounded-xl border border-bone-200/5 bg-ink-800/40 p-5 animate-pulse"
        >
          <div className="h-4 w-40 bg-ink-700 rounded" />
          <div className="mt-3 h-3 w-24 bg-ink-700 rounded" />
        </li>
      ))}
    </ul>
  );
}
