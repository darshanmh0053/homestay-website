"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import BookingStatusControl from "./booking-status-control";
import { useRouter } from "next/navigation";

type Booking = {
  id: string;
  guest_name: string;
  phone: string;
  stay_slug: string;
  check_in: string;
  check_out: string;
  guests: number;
  estimated_amount: number | string | null;
  status: string | null;
  special_request: string;
};

type Props = {
  bookings: Booking[];
};

function getPhoneDigits(phone: string) {
  return phone.replace(/\D/g, "");
}

function getWhatsAppNumber(phone: string) {
  const digits = getPhoneDigits(phone);

  // Assume India for a 10-digit mobile number.
  if (digits.length === 10) {
    return `91${digits}`;
  }

  // Preserve numbers already containing a country code.
  if (digits.length > 10 && digits.length <= 15) {
    return digits;
  }

  return "";
}

function createWhatsAppMessage(booking: Booking) {
  const name = booking.guest_name.trim() || "Guest";
  const stay = booking.stay_slug.replace(/-/g, " ") || "your homestay";
  const checkIn = booking.check_in || "not specified";
  const checkOut = booking.check_out || "not specified";

  return `Hello ${name}, this is Malnad Nest Homestay regarding your booking enquiry for ${stay}. Check-in: ${checkIn}. Check-out: ${checkOut}. Please let us know if you have any questions.`;
}

function formatAmount(amount: number | string | null) {
  if (amount === null || amount === "") {
    return "—";
  }

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return "—";
  }

  return `₹${numericAmount.toLocaleString("en-IN")}`;
}

function ContactActions({ booking }: { booking: Booking }) {
  const phoneDigits = getPhoneDigits(booking.phone);
  const whatsappNumber = getWhatsAppNumber(booking.phone);
  const canCall = phoneDigits.length >= 10 && phoneDigits.length <= 15;

  return (
    <div className="flex flex-wrap gap-2">
      {canCall && (
        <a
          href={`tel:${booking.phone.replace(/[^\d+]/g, "")}`}
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-600"
        >
          <span aria-hidden="true" className="mr-2">
            ☎
          </span>
          Call
        </a>
      )}

      {whatsappNumber && (
        <a
          href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
            createWhatsAppMessage(booking),
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
        >
          WhatsApp
        </a>
      )}

      {!canCall && !whatsappNumber && (
        <span className="text-sm text-stone-500">Check phone number</span>
      )}
    </div>
  );
}

function BookingDetails({ booking }: { booking: Booking }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Check-in
          </p>
          <p className="mt-1 font-medium text-stone-800">
            {booking.check_in || "—"}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Check-out
          </p>
          <p className="mt-1 font-medium text-stone-800">
            {booking.check_out || "—"}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Guests
          </p>
          <p className="mt-1 font-medium text-stone-800">{booking.guests}</p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Estimated amount
          </p>
          <p className="mt-1 font-semibold text-stone-900">
            {formatAmount(booking.estimated_amount)}
          </p>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
          Special request
        </p>
        <p className="mt-1 whitespace-pre-wrap break-words text-stone-700">
          {booking.special_request?.trim() || "No special request"}
        </p>
      </div>
    </div>
  );
}

function DeleteEnquiryButton({
  bookingId,
  onDeleted,
}: {
  bookingId: string;
  onDeleted: (id: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  async function remove() {
    if (
      !window.confirm(
        "Permanently delete this booking enquiry? Any active room hold will be released. This cannot be undone.",
      )
    )
      return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/booking-enquiries/${encodeURIComponent(bookingId)}`,
        { method: "DELETE" },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Could not delete enquiry.");
      onDeleted(bookingId);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not delete enquiry.",
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={remove}
        disabled={loading}
        className="inline-flex min-h-10 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 disabled:opacity-60"
      >
        {loading ? "Deleting…" : "Delete"}
      </button>
      {message && (
        <p role="alert" className="max-w-48 text-xs text-rose-700">
          {message}
        </p>
      )}
    </div>
  );
}

export default function BookingEnquiriesTable({ bookings }: Props) {
  const router = useRouter();
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());
  const visibleBookings = useMemo(
    () => bookings.filter((booking) => !deletedIds.has(booking.id)),
    [bookings, deletedIds],
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkError, setBulkError] = useState(false);
  const [bulkStartDate, setBulkStartDate] = useState("");
  const [bulkEndDate, setBulkEndDate] = useState("");
  const [bulkPreview, setBulkPreview] = useState<{
    count: number;
    startDate: string;
    endDate: string;
  } | null>(null);

  async function previewBulkDelete() {
    setBulkMessage("");
    setBulkError(false);
    setBulkPreview(null);
    if (!bulkStartDate || !bulkEndDate) {
      setBulkError(true);
      setBulkMessage("Choose both a start date and an end date.");
      return;
    }
    if (bulkStartDate > bulkEndDate) {
      setBulkError(true);
      setBulkMessage("The start date must be on or before the end date.");
      return;
    }
    try {
      const params = new URLSearchParams({
        from: bulkStartDate,
        to: bulkEndDate,
      });
      const response = await fetch(
        `/api/admin/booking-enquiries/bulk-delete?${params.toString()}`,
        { cache: "no-store" },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Could not preview deletion.");
      setBulkPreview(result);
    } catch (error) {
      setBulkError(true);
      setBulkMessage(
        error instanceof Error ? error.message : "Could not preview deletion.",
      );
    }
  }

  async function deleteSelectedPeriod() {
    if (!bulkPreview || bulkPreview.count === 0) return;
    const confirmed = window.confirm(
      `Permanently delete ${bulkPreview.count} enquiries created from ${bulkPreview.startDate} through ${bulkPreview.endDate}? Active room holds will be released. This cannot be undone.`,
    );
    if (!confirmed) return;
    setBulkLoading(true);
    setBulkMessage("");
    setBulkError(false);
    try {
      const response = await fetch("/api/admin/booking-enquiries/bulk-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: bulkPreview.startDate,
          to: bulkPreview.endDate,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Could not delete enquiries.");
      setBulkMessage(
        `Deleted ${result.deletedCount} enquiries (${result.startDate} to ${result.endDate}).`,
      );
      setBulkPreview(null);
      router.refresh();
    } catch (error) {
      setBulkError(true);
      setBulkMessage(
        error instanceof Error ? error.message : "Could not delete enquiries.",
      );
    } finally {
      setBulkLoading(false);
    }
  }

  const filteredBookings = useMemo(() => {
    const term = search.trim().toLowerCase();

    return visibleBookings.filter((booking) => {
      const matchesSearch = [
        booking.guest_name,
        booking.phone,
        booking.stay_slug,
        booking.special_request,
      ].some((value) => value.toLowerCase().includes(term));

      const status = (booking.status || "pending").toLowerCase();
      const matchesStatus = statusFilter === "all" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [visibleBookings, search, statusFilter]);

  return (
    <div>
      <div className="mb-5 rounded-2xl border border-rose-100 bg-rose-50/70 p-4 sm:p-5">
        <div>
          <h3 className="font-semibold text-stone-900">Enquiry cleanup</h3>
          <p className="mt-1 text-sm text-stone-600">
            Choose a creation-date range to preview and permanently delete
            enquiries. Active room holds are released first.
          </p>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block text-sm font-medium text-stone-700">
            From date
            <input
              type="date"
              value={bulkStartDate}
              max={bulkEndDate || undefined}
              onChange={(event) => {
                setBulkStartDate(event.target.value);
                setBulkPreview(null);
              }}
              disabled={bulkLoading}
              className="mt-1 block min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-medium text-stone-700">
            To date
            <input
              type="date"
              value={bulkEndDate}
              min={bulkStartDate || undefined}
              onChange={(event) => {
                setBulkEndDate(event.target.value);
                setBulkPreview(null);
              }}
              disabled={bulkLoading}
              className="mt-1 block min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={previewBulkDelete}
            disabled={bulkLoading}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-60"
          >
            Preview selected dates
          </button>
        </div>
        {bulkPreview && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-white p-4">
            <p className="text-sm text-stone-700">
              Creation date range: <strong>{bulkPreview.startDate}</strong> to{" "}
              <strong>{bulkPreview.endDate}</strong> (inclusive)
            </p>
            <p className="mt-1 text-sm text-stone-700">
              Enquiries found: <strong>{bulkPreview.count}</strong>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={deleteSelectedPeriod}
                disabled={bulkLoading || bulkPreview.count === 0}
                className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
              >
                {bulkLoading
                  ? "Deleting…"
                  : `Delete ${bulkPreview.count} enquiries`}
              </button>
              <button
                type="button"
                onClick={() => setBulkPreview(null)}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {bulkMessage && (
          <p
            role={bulkError ? "alert" : "status"}
            className={`mt-3 text-sm ${bulkError ? "text-rose-800" : "text-emerald-800"}`}
          >
            {bulkMessage}
          </p>
        )}
      </div>
      {/* Search, filter, and CSV export */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search guest, phone, homestay, or request..."
          aria-label="Search booking enquiries"
          className="min-w-0 w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
        />

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter bookings by status"
          className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <Link
          href="/api/admin/booking-enquiries/export"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 sm:col-span-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="m7 10 5 5 5-5" />
            <path d="M12 15V3" />
          </svg>
          Export all enquiries to CSV
        </Link>
      </div>

      <p className="mb-4 text-sm text-stone-500" aria-live="polite">
        Showing {filteredBookings.length} of {visibleBookings.length} enquiries
      </p>

      {filteredBookings.length === 0 ? (
        <p className="rounded-lg bg-stone-50 p-6 text-sm text-stone-600">
          No matching booking enquiries found.
        </p>
      ) : (
        <>
          {/* Mobile booking cards */}
          <div className="space-y-4 md:hidden">
            {filteredBookings.map((booking) => (
              <article
                key={booking.id}
                className="min-w-0 rounded-xl border border-stone-200 bg-white p-4"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words font-semibold text-stone-900">
                        {booking.guest_name || "Guest"}
                      </h3>
                      <p className="mt-1 break-all text-sm text-stone-500">
                        {booking.phone || "No phone number"}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium capitalize text-stone-700">
                      {booking.status || "pending"}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                      Homestay
                    </p>
                    <p className="mt-1 break-words font-medium capitalize text-stone-800">
                      {booking.stay_slug.replace(/-/g, " ") || "—"}
                    </p>
                  </div>

                  <BookingDetails booking={booking} />

                  <div className="border-t border-stone-100 pt-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">
                      Contact guest
                    </p>
                    <ContactActions booking={booking} />
                  </div>

                  <div className="border-t border-stone-100 pt-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">
                      Update booking status
                    </p>
                    <BookingStatusControl
                      id={booking.id}
                      currentStatus={booking.status || "pending"}
                    />
                  </div>
                  <div className="border-t border-stone-100 pt-3">
                    <DeleteEnquiryButton
                      bookingId={booking.id}
                      onDeleted={(id) => {
                        setDeletedIds((current) => new Set(current).add(id));
                        router.refresh();
                      }}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Desktop booking table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-stone-600">
                  <th className="px-3 py-3 font-medium">Guest</th>
                  <th className="px-3 py-3 font-medium">Homestay</th>
                  <th className="px-3 py-3 font-medium">Check-in</th>
                  <th className="px-3 py-3 font-medium">Check-out</th>
                  <th className="px-3 py-3 font-medium">Guests</th>
                  <th className="px-3 py-3 font-medium">Amount</th>
                  <th className="px-3 py-3 font-medium">Special request</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Update</th>
                  <th className="px-3 py-3 font-medium">Contact</th>
                  <th className="px-3 py-3 font-medium">Delete</th>
                </tr>
              </thead>

              <tbody>
                {filteredBookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="border-b border-stone-100 align-top last:border-0"
                  >
                    <td className="px-3 py-4">
                      <p className="font-medium text-stone-900">
                        {booking.guest_name || "Guest"}
                      </p>
                      <p className="mt-1 text-stone-500">
                        {booking.phone || "No phone number"}
                      </p>
                    </td>

                    <td className="px-3 py-4 capitalize text-stone-700">
                      {booking.stay_slug.replace(/-/g, " ") || "—"}
                    </td>

                    <td className="whitespace-nowrap px-3 py-4 text-stone-700">
                      {booking.check_in || "—"}
                    </td>

                    <td className="whitespace-nowrap px-3 py-4 text-stone-700">
                      {booking.check_out || "—"}
                    </td>

                    <td className="px-3 py-4 text-stone-700">
                      {booking.guests}
                    </td>

                    <td className="whitespace-nowrap px-3 py-4 text-stone-700">
                      {formatAmount(booking.estimated_amount)}
                    </td>

                    <td className="max-w-[220px] px-3 py-4 text-stone-700">
                      <p className="whitespace-pre-wrap break-words">
                        {booking.special_request?.trim() ||
                          "No special request"}
                      </p>
                    </td>

                    <td className="px-3 py-4">
                      <span className="inline-block rounded-full bg-stone-100 px-3 py-1 text-xs font-medium capitalize text-stone-700">
                        {booking.status || "pending"}
                      </span>
                    </td>

                    <td className="px-3 py-4">
                      <BookingStatusControl
                        id={booking.id}
                        currentStatus={booking.status || "pending"}
                      />
                    </td>

                    <td className="px-3 py-4">
                      <ContactActions booking={booking} />
                    </td>
                    <td className="px-3 py-4">
                      <DeleteEnquiryButton
                        bookingId={booking.id}
                        onDeleted={(id) => {
                          setDeletedIds((current) => new Set(current).add(id));
                          router.refresh();
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
