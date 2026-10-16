"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RoomManager from "./RoomManager";
import MealAmenityManager from "./MealAmenityManager";

type HomestaySetting = {
  stay_slug: string;
  display_name: string;
  base_price_per_guest_night: number;
  included_guests: number;
  max_guests_per_booking: number;
  default_hold_minutes: number;
  is_active: boolean;
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<HomestaySetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadSettings() {
      try {
        const response = await fetch("/api/admin/homestay-settings", {
          cache: "no-store",
          signal: controller.signal,
        });

        const result = await response.json();

        if (!response.ok) {
          setError(result.error ?? "Could not load homestay settings.");
          return;
        }

        setSettings(
          (result.settings ?? []).map((item: HomestaySetting) => ({
            ...item,
            base_price_per_guest_night: Number(item.base_price_per_guest_night),
            included_guests: Number(item.included_guests),
            max_guests_per_booking: Number(item.max_guests_per_booking),
            default_hold_minutes: Number(item.default_hold_minutes),
          })),
        );
      } catch {
        if (!controller.signal.aborted) {
          setError("Could not connect to the server. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadSettings();

    return () => controller.abort();
  }, []);

  function updateSetting(
    slug: string,
    field: keyof HomestaySetting,
    value: string | boolean,
  ) {
    setSettings((current) =>
      current.map((item) => {
        if (item.stay_slug !== slug) return item;

        if (
          field === "base_price_per_guest_night" ||
          field === "included_guests" ||
          field === "max_guests_per_booking" ||
          field === "default_hold_minutes"
        ) {
          return {
            ...item,
            [field]: value === "" ? 0 : Number(value),
          };
        }

        return { ...item, [field]: value };
      }),
    );
  }

  async function saveSetting(setting: HomestaySetting) {
    if (savingSlug !== null) return;

    setSavingSlug(setting.stay_slug);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/homestay-settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(setting),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "Could not save settings.");
        return;
      }

      const saved = result.setting as HomestaySetting;

      setSettings((current) =>
        current.map((item) =>
          item.stay_slug === saved.stay_slug
            ? {
                ...saved,
                base_price_per_guest_night: Number(
                  saved.base_price_per_guest_night,
                ),
                included_guests: Number(saved.included_guests),
                max_guests_per_booking: Number(saved.max_guests_per_booking),
                default_hold_minutes: Number(saved.default_hold_minutes),
              }
            : item,
        ),
      );

      setMessage(`${saved.display_name} settings saved successfully.`);
    } catch {
      setError("Could not connect to the server. Please try again.");
    } finally {
      setSavingSlug(null);
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6 text-stone-900 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <Link
            href="/admin"
            className="inline-flex min-h-10 items-center text-sm font-medium text-emerald-800 hover:underline"
          >
            ← Back to dashboard
          </Link>

          <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            Homestay settings
          </h1>

          <p className="mt-2 text-sm text-stone-600">
            Manage booking prices, guest limits, rooms, meals and amenities.
          </p>
        </header>

        {message && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        {loading ? (
          <p className="py-10 text-stone-600">Loading homestay settings...</p>
        ) : settings.length === 0 && !error ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <p className="font-semibold">No homestay settings found.</p>
            <p className="mt-2 text-sm text-stone-600">
              Add a homestay first, then configure its booking settings.
            </p>
            <Link
              href="/admin/homestays"
              className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900"
            >
              Manage homestays
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {settings.map((setting, index) => (
              <section
                key={setting.stay_slug}
                id={index === 0 ? "booking-settings" : undefined}
                className="scroll-mt-6 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-7"
              >
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="break-words text-xl font-semibold">
                      {setting.display_name}
                    </h2>
                    <p className="mt-1 break-all text-xs text-stone-500">
                      {setting.stay_slug}
                    </p>
                  </div>

                  <label className="flex min-h-10 items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={setting.is_active}
                      onChange={(event) =>
                        updateSetting(
                          setting.stay_slug,
                          "is_active",
                          event.target.checked,
                        )
                      }
                      className="h-4 w-4 accent-emerald-700"
                    />
                    Active
                  </label>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block text-sm font-medium">
                    Display name
                    <input
                      value={setting.display_name}
                      onChange={(event) =>
                        updateSetting(
                          setting.stay_slug,
                          "display_name",
                          event.target.value,
                        )
                      }
                      maxLength={100}
                      required
                      className="mt-2 min-h-11 w-full rounded-lg border border-stone-300 px-3 py-2.5 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                    />
                  </label>

                  <label className="block text-sm font-medium">
                    Base price per guest, per night (₹)
                    <input
                      type="number"
                      min="0"
                      max="10000000"
                      step="50"
                      value={setting.base_price_per_guest_night}
                      onChange={(event) =>
                        updateSetting(
                          setting.stay_slug,
                          "base_price_per_guest_night",
                          event.target.value,
                        )
                      }
                      required
                      className="mt-2 min-h-11 w-full rounded-lg border border-stone-300 px-3 py-2.5 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                    />
                  </label>

                  <label className="block text-sm font-medium">
                    Guests included in base price
                    <input
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      value={setting.included_guests}
                      onChange={(event) =>
                        updateSetting(
                          setting.stay_slug,
                          "included_guests",
                          event.target.value,
                        )
                      }
                      required
                      className="mt-2 min-h-11 w-full rounded-lg border border-stone-300 px-3 py-2.5 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                    />
                  </label>

                  <label className="block text-sm font-medium">
                    Maximum guests per booking
                    <input
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      value={setting.max_guests_per_booking}
                      onChange={(event) =>
                        updateSetting(
                          setting.stay_slug,
                          "max_guests_per_booking",
                          event.target.value,
                        )
                      }
                      required
                      className="mt-2 min-h-11 w-full rounded-lg border border-stone-300 px-3 py-2.5 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                    />
                  </label>

                  <label className="block text-sm font-medium sm:col-span-2">
                    Pending booking hold duration (minutes)
                    <input
                      type="number"
                      min="5"
                      max="1440"
                      step="5"
                      value={setting.default_hold_minutes}
                      onChange={(event) =>
                        updateSetting(
                          setting.stay_slug,
                          "default_hold_minutes",
                          event.target.value,
                        )
                      }
                      required
                      className="mt-2 min-h-11 w-full rounded-lg border border-stone-300 px-3 py-2.5 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 sm:max-w-sm"
                    />
                    <span className="mt-1 block font-normal leading-5 text-stone-500">
                      How long a pending enquiry should temporarily hold
                      availability.
                    </span>
                  </label>
                </div>

                <div className="mt-6 flex justify-stretch sm:justify-end">
                  <button
                    type="button"
                    disabled={savingSlug !== null}
                    onClick={() => void saveSetting(setting)}
                    className="min-h-11 w-full rounded-xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {savingSlug === setting.stay_slug
                      ? "Saving..."
                      : "Save settings"}
                  </button>
                </div>
              </section>
            ))}
          </div>
        )}

        <section
          id="rooms"
          className="mt-8 scroll-mt-6 rounded-2xl border border-stone-200 bg-white p-4 sm:p-6"
        >
          <h2 className="mb-5 text-xl font-semibold">Rooms & Pricing</h2>
          <p className="mb-5 text-sm text-stone-600">
            Manage room names, guest capacity, room counts and per-guest rates.
          </p>
          <RoomManager />
        </section>

        <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-4 sm:p-6">
          <h2 className="mb-5 text-xl font-semibold">Meals & Amenities</h2>
          <MealAmenityManager />
        </section>

        <div className="mt-8">
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center text-sm font-medium text-emerald-800 hover:underline"
          >
            ← Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
