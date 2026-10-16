"use client";

import { useEffect, useState } from "react";

export type StaySearchDetails = {
  destination: string;
  checkIn: string;
  checkOut: string;
};

export const SEARCH_STORAGE_KEY = "malnadNestSearch";

export default function StaySearch() {
  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [error, setError] = useState("");

  // Initialize the local date without updating state inside useEffect.
  const [today] = useState(() => getLocalDate());

  useEffect(() => {
    function syncSearch(event: Event) {
      if (!(event instanceof CustomEvent) || !event.detail) {
        return;
      }

      const updated = event.detail as StaySearchDetails;

      setDestination(updated.destination ?? "");
      setCheckIn(updated.checkIn ?? "");
      setCheckOut(updated.checkOut ?? "");
      setError("");
    }

    window.addEventListener("malnad-search-updated", syncSearch);

    return () => {
      window.removeEventListener("malnad-search-updated", syncSearch);
    };
  }, []);

  function handleCheckIn(value: string) {
    setCheckIn(value);
    setError("");

    if (checkOut && value && checkOut <= value) {
      setCheckOut("");
    }
  }

  function handleSearch() {
    if (checkIn && checkIn < today) {
      setError("Check-in cannot be in the past.");
      return;
    }

    if (checkOut && checkOut < today) {
      setError("Check-out cannot be in the past.");
      return;
    }

    if (checkIn && checkOut && checkOut <= checkIn) {
      setError("Check-out must be after check-in.");
      return;
    }

    const search: StaySearchDetails = {
      destination,
      checkIn,
      checkOut,
    };

    try {
      sessionStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(search));
    } catch (storageError) {
      console.error("Unable to save search preferences:", storageError);
    }

    window.dispatchEvent(
      new CustomEvent("malnad-search-updated", {
        detail: search,
      }),
    );

    setError("");

    document.getElementById("stays")?.scrollIntoView({
      behavior: "smooth",
    });
  }

  function handleClear() {
    const emptySearch: StaySearchDetails = {
      destination: "",
      checkIn: "",
      checkOut: "",
    };

    setDestination("");
    setCheckIn("");
    setCheckOut("");
    setError("");

    try {
      sessionStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(emptySearch));
    } catch (storageError) {
      console.error("Unable to clear saved search:", storageError);
    }

    window.dispatchEvent(
      new CustomEvent("malnad-search-updated", {
        detail: emptySearch,
      }),
    );

    document.getElementById("stays")?.scrollIntoView({
      behavior: "smooth",
    });
  }

  const nextCheckOutDay = checkIn ? getNextDay(checkIn) : getNextDay(today);

  return (
    <section
      className="w-full rounded-2xl border border-stone-200 bg-white p-4 shadow-lg sm:p-6"
      aria-label="Search for a homestay"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:items-end">
        <div>
          <label
            htmlFor="destination"
            className="mb-2 block text-sm font-semibold text-stone-700"
          >
            Destination
          </label>

          <select
            id="destination"
            value={destination}
            onChange={(event) => {
              setDestination(event.target.value);
              setError("");
            }}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-3 text-stone-800 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="">All destinations</option>
            <option value="chikkamagaluru">Chikkamagaluru</option>
            <option value="sakleshpur">Sakleshpur</option>
            <option value="coorg">Coorg</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="checkIn"
            className="mb-2 block text-sm font-semibold text-stone-700"
          >
            Check-in
          </label>

          <input
            id="checkIn"
            type="date"
            value={checkIn}
            min={today || undefined}
            onChange={(event) => handleCheckIn(event.target.value)}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-3 text-stone-800 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <div>
          <label
            htmlFor="checkOut"
            className="mb-2 block text-sm font-semibold text-stone-700"
          >
            Check-out
          </label>

          <input
            id="checkOut"
            type="date"
            value={checkOut}
            min={nextCheckOutDay}
            onChange={(event) => {
              setCheckOut(event.target.value);
              setError("");
            }}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-3 text-stone-800 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSearch}
            className="flex-1 rounded-lg bg-emerald-800 px-4 py-3 font-semibold text-white transition hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
          >
            Find a stay
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg border border-stone-300 px-4 py-3 font-semibold text-stone-700 transition hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-400"
          >
            Clear
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}

function getLocalDate(): string {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getNextDay(dateString: string): string {
  const date = new Date(`${dateString}T12:00:00`);

  date.setDate(date.getDate() + 1);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
