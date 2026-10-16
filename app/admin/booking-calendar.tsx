"use client";

import { useMemo, useState } from "react";
import { stays } from "@/data/stays";

type CalendarBooking = {
  id: string;
  guest_name: string;
  phone: string;
  stay_slug: string;
  check_in: string;
  check_out: string;
  guests: number;
  estimated_amount: number | string | null;
  status: string;
  special_request: string;
};

type BookingCalendarProps = {
  bookings: CalendarBooking[];
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_STYLES: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  cancelled: "border-rose-200 bg-rose-50 text-rose-800",
};

function parseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value: string): string {
  const date = parseDate(value);

  return date
    ? date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : value || "Not provided";
}

function getStatus(value: string): string {
  const status = value.toLowerCase();
  return status in STATUS_STYLES ? status : "pending";
}

function getStayName(slug: string): string {
  return (
    stays.find((stay) => stay.slug === slug)?.name ?? slug.replace(/-/g, " ")
  );
}

function getOccupiedDates(booking: CalendarBooking): string[] {
  const checkIn = parseDate(booking.check_in);
  const checkOut = parseDate(booking.check_out);

  if (!checkIn || !checkOut || checkOut <= checkIn) return [];

  const dates: string[] = [];
  const cursor = new Date(checkIn);

  // Include check-in; exclude checkout.
  while (cursor < checkOut) {
    dates.push(dateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function findConfirmedConflicts(bookings: CalendarBooking[]) {
  const confirmed = bookings.filter(
    (booking) => getStatus(booking.status) === "confirmed",
  );

  const conflicts = new Set<string>();

  for (let i = 0; i < confirmed.length; i++) {
    const first = confirmed[i];
    const firstCheckIn = parseDate(first.check_in);
    const firstCheckOut = parseDate(first.check_out);

    if (!firstCheckIn || !firstCheckOut || firstCheckOut <= firstCheckIn) {
      continue;
    }

    for (let j = i + 1; j < confirmed.length; j++) {
      const second = confirmed[j];

      if (first.stay_slug !== second.stay_slug || first.id === second.id) {
        continue;
      }

      const secondCheckIn = parseDate(second.check_in);
      const secondCheckOut = parseDate(second.check_out);

      if (
        !secondCheckIn ||
        !secondCheckOut ||
        secondCheckOut <= secondCheckIn
      ) {
        continue;
      }

      // Checkout on the same day as another check-in is allowed.
      if (firstCheckIn < secondCheckOut && secondCheckIn < firstCheckOut) {
        conflicts.add(first.id);
        conflicts.add(second.id);
      }
    }
  }

  return conflicts;
}

export default function BookingCalendar({ bookings }: BookingCalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));

  const [selectedStay, setSelectedStay] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const conflicts = useMemo(() => findConfirmedConflicts(bookings), [bookings]);

  const filteredBookings = useMemo(
    () =>
      bookings.filter((booking) => {
        const stayMatches =
          selectedStay === "all" || booking.stay_slug === selectedStay;

        const statusMatches =
          selectedStatus === "all" ||
          getStatus(booking.status) === selectedStatus;

        return stayMatches && statusMatches;
      }),
    [bookings, selectedStay, selectedStatus],
  );

  const filteredConflicts = filteredBookings.filter((booking) =>
    conflicts.has(booking.id),
  );

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();

  const monthStart = dateKey(new Date(year, month, 1));
  const monthEnd = dateKey(new Date(year, month + 1, 0));

  const monthlyBookings = useMemo(
    () =>
      filteredBookings.filter((booking) => {
        const checkIn = parseDate(booking.check_in);
        const checkOut = parseDate(booking.check_out);

        if (!checkIn || !checkOut || checkOut <= checkIn) return false;

        return dateKey(checkIn) <= monthEnd && dateKey(checkOut) > monthStart;
      }),
    [filteredBookings, monthStart, monthEnd],
  );

  const summary = useMemo(() => {
    const pending = monthlyBookings.filter(
      (booking) => getStatus(booking.status) === "pending",
    ).length;

    const confirmed = monthlyBookings.filter(
      (booking) => getStatus(booking.status) === "confirmed",
    ).length;

    const cancelled = monthlyBookings.filter(
      (booking) => getStatus(booking.status) === "cancelled",
    ).length;

    const occupiedByStay = new Map<string, Set<string>>();

    for (const booking of monthlyBookings) {
      if (getStatus(booking.status) !== "confirmed") continue;

      const nights = occupiedByStay.get(booking.stay_slug) ?? new Set<string>();

      for (const date of getOccupiedDates(booking)) {
        if (date >= monthStart && date <= monthEnd) {
          nights.add(date);
        }
      }

      occupiedByStay.set(booking.stay_slug, nights);
    }

    let occupiedNights = 0;

    for (const nights of occupiedByStay.values()) {
      occupiedNights += nights.size;
    }

    const conflictCount = monthlyBookings.filter((booking) =>
      conflicts.has(booking.id),
    ).length;

    return {
      pending,
      confirmed,
      cancelled,
      occupiedNights,
      conflictCount,
    };
  }, [monthlyBookings, monthStart, monthEnd, conflicts]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    const numberOfDays = new Date(year, month + 1, 0).getDate();
    const totalCells = Math.ceil((mondayOffset + numberOfDays) / 7) * 7;

    return Array.from({ length: totalCells }, (_, index) => {
      const dayNumber = index - mondayOffset + 1;

      if (dayNumber < 1 || dayNumber > numberOfDays) {
        return null;
      }

      const date = new Date(year, month, dayNumber);

      return {
        key: dateKey(date),
        dayNumber,
      };
    });
  }, [year, month]);

  const bookingsByDate = useMemo(() => {
    const result = new Map<string, CalendarBooking[]>();

    for (const booking of filteredBookings) {
      for (const key of getOccupiedDates(booking)) {
        const existing = result.get(key) ?? [];
        existing.push(booking);
        result.set(key, existing);
      }
    }

    return result;
  }, [filteredBookings]);

  const selectedBookings = bookingsByDate.get(selectedDate) ?? [];

  function changeMonth(offset: number) {
    setVisibleMonth(new Date(year, month + offset, 1));
  }

  const summaryCards = [
    {
      title: "Confirmed reservations",
      count: summary.confirmed,
      description: "Confirmed bookings overlapping this month",
      style: "border-emerald-200 bg-emerald-50",
    },
    {
      title: "Pending enquiries",
      count: summary.pending,
      description: "Awaiting a decision",
      style: "border-amber-200 bg-amber-50",
    },
    {
      title: "Cancelled enquiries",
      count: summary.cancelled,
      description: "Not counted as occupied nights",
      style: "border-rose-200 bg-rose-50",
    },
    {
      title: "Confirmed occupied nights",
      count: summary.occupiedNights,
      description: "Unique nights per homestay in this month",
      style: "border-stone-200 bg-white",
    },
  ];

  return (
    <section
      aria-label="Booking calendar"
      className="mb-8 rounded-2xl border border-stone-200 bg-white p-4 sm:p-6"
    >
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-stone-900">
            Booking Calendar
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Review reservations, enquiries, occupied nights, and conflicts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            aria-label="Previous month"
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm hover:bg-stone-50"
          >
            ←
          </button>

          <p
            aria-live="polite"
            className="min-w-36 text-center font-semibold text-stone-800"
          >
            {visibleMonth.toLocaleDateString("en-IN", {
              month: "long",
              year: "numeric",
            })}
          </p>

          <button
            type="button"
            onClick={() => changeMonth(1)}
            aria-label="Next month"
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm hover:bg-stone-50"
          >
            →
          </button>

          <button
            type="button"
            onClick={() => {
              const today = new Date();
              setVisibleMonth(
                new Date(today.getFullYear(), today.getMonth(), 1),
              );
              setSelectedDate(dateKey(today));
            }}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm hover:bg-stone-50"
          >
            Today
          </button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-stone-700">
          Filter by homestay
          <select
            value={selectedStay}
            onChange={(event) => setSelectedStay(event.target.value)}
            className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 font-normal"
          >
            <option value="all">All homestays</option>
            {stays.map((stay) => (
              <option key={stay.slug} value={stay.slug}>
                {stay.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-stone-700">
          Filter by status
          <select
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
            className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 font-normal"
          >
            <option value="all">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <article
            key={card.title}
            className={`rounded-xl border p-4 ${card.style}`}
          >
            <p className="text-sm font-medium text-stone-700">{card.title}</p>
            <p className="mt-2 text-3xl font-semibold text-stone-900">
              {card.count}
            </p>
            <p className="mt-2 text-xs leading-5 text-stone-600">
              {card.description}
            </p>
          </article>
        ))}
      </div>

      {summary.conflictCount > 0 && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4"
        >
          <h3 className="font-semibold text-red-900">
            Booking conflicts need review
          </h3>
          <p className="mt-1 text-sm text-red-800">
            {summary.conflictCount} confirmed booking record(s) in this month
            are involved in an overlap for the same homestay.
          </p>
          <p className="mt-1 text-xs text-red-800">
            Review the flagged bookings below before relying on this calendar
            for availability.
          </p>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3 text-xs text-stone-700">
        {[
          ["pending", "Pending"],
          ["confirmed", "Confirmed"],
          ["cancelled", "Cancelled"],
        ].map(([status, label]) => (
          <span key={status} className="flex items-center gap-2">
            <span
              className={`h-3 w-3 rounded-sm ${
                status === "pending"
                  ? "bg-amber-400"
                  : status === "confirmed"
                    ? "bg-emerald-500"
                    : "bg-rose-400"
              }`}
            />
            {label}
          </span>
        ))}
      </div>

      <p className="mb-3 text-sm text-stone-600">
        Showing {filteredBookings.length} of {bookings.length} loaded enquiries.
      </p>

      <div className="grid grid-cols-7 border-l border-t border-stone-200">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="border-b border-r border-stone-200 bg-stone-50 py-2 text-center text-xs font-semibold text-stone-600 sm:text-sm"
          >
            {weekday}
          </div>
        ))}

        {calendarDays.map((cell, index) => {
          if (!cell) {
            return (
              <div
                key={`empty-${index}`}
                aria-hidden="true"
                className="min-h-16 border-b border-r border-stone-200 bg-stone-50/60 sm:min-h-24"
              />
            );
          }

          const dayBookings = bookingsByDate.get(cell.key) ?? [];
          const isSelected = selectedDate === cell.key;
          const isToday = dateKey(new Date()) === cell.key;

          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => setSelectedDate(cell.key)}
              aria-pressed={isSelected}
              aria-label={`${formatDate(cell.key)}, ${dayBookings.length} booking enquiries`}
              className={`min-h-16 overflow-hidden border-b border-r border-stone-200 p-1 text-left transition sm:min-h-24 sm:p-2 ${
                isSelected
                  ? "bg-emerald-50 ring-2 ring-inset ring-emerald-700"
                  : "bg-white hover:bg-stone-50"
              }`}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  isToday ? "bg-emerald-800 text-white" : "text-stone-800"
                }`}
              >
                {cell.dayNumber}
              </span>

              <div className="mt-1 space-y-1">
                {dayBookings.slice(0, 2).map((booking) => {
                  const status = getStatus(booking.status);
                  const hasConflict = conflicts.has(booking.id);

                  return (
                    <div
                      key={booking.id}
                      className={`truncate rounded border px-1 py-0.5 text-[10px] sm:text-xs ${
                        hasConflict
                          ? "border-red-400 bg-red-100 text-red-900"
                          : STATUS_STYLES[status]
                      }`}
                      title={
                        hasConflict
                          ? `${booking.guest_name} — Conflict detected`
                          : `${booking.guest_name} — ${status}`
                      }
                    >
                      <span className="hidden sm:inline">
                        {hasConflict ? "⚠ " : ""}
                        {booking.guest_name || "Guest"}
                      </span>
                      <span className="sm:hidden">
                        {hasConflict
                          ? "⚠ Conflict"
                          : status === "confirmed"
                            ? "Confirmed"
                            : status === "cancelled"
                              ? "Cancelled"
                              : "Pending"}
                      </span>
                    </div>
                  );
                })}

                {dayBookings.length > 2 && (
                  <p className="text-[10px] text-stone-500 sm:text-xs">
                    +{dayBookings.length - 2} more
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl border border-stone-200 p-4">
        <h3 className="font-semibold text-stone-900">
          Enquiries for {formatDate(selectedDate)}
        </h3>

        {selectedBookings.length === 0 ? (
          <p className="mt-2 text-sm text-stone-600">
            No booking enquiries match this date and these filters.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {selectedBookings.map((booking) => {
              const status = getStatus(booking.status);
              const hasConflict = conflicts.has(booking.id);

              return (
                <article
                  key={booking.id}
                  className={`rounded-lg border p-3 sm:p-4 ${
                    hasConflict
                      ? "border-red-300 bg-red-50"
                      : "border-stone-200"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-stone-900">
                        {booking.guest_name || "Guest"}
                      </p>
                      <p className="mt-1 text-sm text-stone-600">
                        {getStayName(booking.stay_slug)}
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[status]}`}
                    >
                      {status}
                    </span>
                  </div>

                  {hasConflict && (
                    <p className="mt-3 rounded-lg border border-red-200 bg-white p-3 text-sm font-medium text-red-800">
                      ⚠ Date overlap detected with another confirmed booking for
                      this homestay. Review both reservations.
                    </p>
                  )}

                  <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-stone-700 sm:grid-cols-2">
                    <p>
                      <span className="font-medium">Check-in:</span>{" "}
                      {formatDate(booking.check_in)}
                    </p>
                    <p>
                      <span className="font-medium">Check-out:</span>{" "}
                      {formatDate(booking.check_out)}
                    </p>
                    <p>
                      <span className="font-medium">Guests:</span>{" "}
                      {booking.guests}
                    </p>
                    <p>
                      <span className="font-medium">Phone:</span>{" "}
                      {booking.phone || "Not provided"}
                    </p>
                  </div>

                  {booking.special_request && (
                    <p className="mt-3 text-sm text-stone-600">
                      <span className="font-medium">Special request:</span>{" "}
                      {booking.special_request}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {filteredConflicts.length > 0 && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <h3 className="font-semibold text-red-900">
            Confirmed bookings requiring review
          </h3>
          <p className="mt-1 text-sm text-red-800">
            The following records overlap with another confirmed booking for the
            same homestay. Select a date in the calendar to review the details.
          </p>

          <div className="mt-3 space-y-2">
            {filteredConflicts.map((booking) => (
              <div
                key={booking.id}
                className="rounded-lg border border-red-200 bg-white p-3 text-sm"
              >
                <p className="font-medium text-stone-900">
                  {booking.guest_name || "Guest"} —{" "}
                  {getStayName(booking.stay_slug)}
                </p>
                <p className="mt-1 text-stone-700">
                  {formatDate(booking.check_in)} to{" "}
                  {formatDate(booking.check_out)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-xs leading-5 text-stone-500">
        Conflict detection checks the latest loaded enquiries and flags
        overlapping confirmed records for the same homestay. Checkout dates are
        excluded from occupied nights. This is a dashboard warning only; it does
        not prevent overlapping bookings from being created. The dashboard
        currently loads the latest 100 enquiries.
      </p>
    </section>
  );
}
