"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BookingStatus = "pending" | "confirmed" | "cancelled";

type Props = {
  id: string;
  currentStatus: string;
};

export default function BookingStatusControl({ id, currentStatus }: Props) {
  const router = useRouter();

  const initialStatus: BookingStatus =
    currentStatus === "confirmed" || currentStatus === "cancelled"
      ? currentStatus
      : "pending";

  const [status, setStatus] = useState<BookingStatus>(initialStatus);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function updateStatus() {
    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const response = await fetch(
        `/api/admin/booking-enquiries/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        setIsError(true);
        setMessage(result.error || "Could not update status.");
        return;
      }

      setMessage("Updated successfully");
      router.refresh();
    } catch {
      setIsError(true);
      setMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-w-40 space-y-2">
      <select
        value={status}
        onChange={(event) => {
          setStatus(event.target.value as BookingStatus);
          setMessage("");
        }}
        disabled={loading}
        aria-label={`Status for enquiry ${id}`}
        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
      >
        <option value="pending">Pending</option>
        <option value="confirmed">Confirmed</option>
        <option value="cancelled">Cancelled</option>
      </select>

      <button
        type="button"
        onClick={updateStatus}
        disabled={loading}
        className="w-full rounded-lg bg-emerald-800 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Updating..." : "Update status"}
      </button>

      {message && (
        <p
          role="status"
          className={`text-xs ${isError ? "text-red-700" : "text-emerald-800"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
