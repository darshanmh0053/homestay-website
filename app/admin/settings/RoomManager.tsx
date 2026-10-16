"use client";

import { useCallback, useEffect, useState } from "react";

type Homestay = {
  stay_slug: string;
  display_name: string;
};

type Room = {
  id: string;
  stay_slug: string;
  room_name: string;
  description: string;
  max_guests: number;
  room_count: number;
  price_per_guest_night: number | null;
  amenities: string[];
  is_active: boolean;
};

type RoomForm = {
  stay_slug: string;
  room_name: string;
  description: string;
  max_guests: string;
  room_count: string;
  price_per_guest_night: string;
  amenities: string;
  is_active: boolean;
};

type SettingsResponse = {
  settings?: Homestay[];
  error?: string;
};

type RoomsResponse = {
  rooms?: Room[];
  error?: string;
};

const blankForm: RoomForm = {
  stay_slug: "",
  room_name: "",
  description: "",
  max_guests: "2",
  room_count: "1",
  price_per_guest_night: "",
  amenities: "",
  is_active: true,
};

async function readJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

export default function RoomManager() {
  const [homestays, setHomestays] = useState<Homestay[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedStay, setSelectedStay] = useState("");
  const [form, setForm] = useState<RoomForm>(blankForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    setError("");

    try {
      const [settingsResponse, roomsResponse] = await Promise.all([
        fetch("/api/admin/homestay-settings", { cache: "no-store" }),
        fetch("/api/admin/homestay-rooms", { cache: "no-store" }),
      ]);

      const settingsData = await readJson<SettingsResponse>(settingsResponse);
      const roomsData = await readJson<RoomsResponse>(roomsResponse);

      if (!settingsResponse.ok) {
        throw new Error(
          settingsData.error || "Could not load homestay settings.",
        );
      }

      if (!roomsResponse.ok) {
        throw new Error(roomsData.error || "Could not load rooms.");
      }

      const stays = settingsData.settings ?? [];
      const loadedRooms = roomsData.rooms ?? [];

      setHomestays(stays);
      setRooms(loadedRooms);

      setSelectedStay((current) => {
        if (stays.some((stay) => stay.stay_slug === current)) {
          return current;
        }

        return stays[0]?.stay_slug ?? "";
      });

      setForm((current) => ({
        ...current,
        stay_slug: current.stay_slug || stays[0]?.stay_slug || "",
      }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load room information.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const [settingsResponse, roomsResponse] = await Promise.all([
          fetch("/api/admin/homestay-settings", { cache: "no-store" }),
          fetch("/api/admin/homestay-rooms", { cache: "no-store" }),
        ]);

        const settingsData = await readJson<SettingsResponse>(settingsResponse);
        const roomsData = await readJson<RoomsResponse>(roomsResponse);

        if (!settingsResponse.ok) {
          throw new Error(
            settingsData.error || "Could not load homestay settings.",
          );
        }

        if (!roomsResponse.ok) {
          throw new Error(roomsData.error || "Could not load rooms.");
        }

        if (cancelled) return;

        const stays = settingsData.settings ?? [];
        const loadedRooms = roomsData.rooms ?? [];
        const initialStay = stays[0]?.stay_slug ?? "";

        setHomestays(stays);
        setRooms(loadedRooms);
        setSelectedStay(initialStay);
        setForm({ ...blankForm, stay_slug: initialStay });
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load room information.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm({
      ...blankForm,
      stay_slug: selectedStay,
    });
    setError("");
    setMessage("");
  }

  function editRoom(room: Room) {
    setEditingId(room.id);
    setSelectedStay(room.stay_slug);

    setForm({
      stay_slug: room.stay_slug,
      room_name: room.room_name,
      description: room.description ?? "",
      max_guests: String(room.max_guests),
      room_count: String(room.room_count ?? 1),
      price_per_guest_night:
        room.price_per_guest_night == null
          ? ""
          : String(room.price_per_guest_night),
      amenities: (room.amenities ?? []).join(", "),
      is_active: room.is_active,
    });

    setError("");
    setMessage("");
  }

  async function saveRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const maxGuests = Number(form.max_guests);
    const roomCount = Number(form.room_count);
    const priceText = form.price_per_guest_night.trim();
    const price = priceText === "" ? null : Number(priceText);

    if (!form.stay_slug) {
      setError("Please select a homestay.");
      return;
    }

    if (!form.room_name.trim()) {
      setError("Please enter a room name.");
      return;
    }

    if (!Number.isInteger(maxGuests) || maxGuests < 1 || maxGuests > 100) {
      setError("Maximum guests must be a whole number from 1 to 100.");
      return;
    }

    if (!Number.isInteger(roomCount) || roomCount < 1 || roomCount > 100) {
      setError("Number of rooms must be a whole number from 1 to 100.");
      return;
    }

    if (
      price !== null &&
      (!Number.isFinite(price) || price < 0 || price > 10000000)
    ) {
      setError("Enter a valid room price or leave it blank.");
      return;
    }

    const payload = {
      stay_slug: form.stay_slug,
      room_name: form.room_name.trim(),
      description: form.description.trim(),
      max_guests: maxGuests,
      room_count: roomCount,
      price_per_guest_night: price,
      amenities: form.amenities
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      is_active: form.is_active,
    };

    setSaving(true);

    try {
      const response = await fetch("/api/admin/homestay-rooms", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingId ? { id: editingId, ...payload } : payload,
        ),
      });

      const result = await readJson<{ error?: string }>(response);

      if (!response.ok) {
        throw new Error(result.error || "Could not save the room.");
      }

      setMessage(
        editingId ? "Room updated successfully." : "Room added successfully.",
      );

      setEditingId(null);
      setForm({ ...blankForm, stay_slug: selectedStay });

      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the room.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleRoom(room: Room) {
    const activate = !room.is_active;

    if (
      !window.confirm(
        `Are you sure you want to ${activate ? "activate" : "deactivate"} "${room.room_name}"?`,
      )
    ) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/homestay-rooms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: room.id,
          stay_slug: room.stay_slug,
          room_name: room.room_name,
          description: room.description ?? "",
          max_guests: room.max_guests,
          room_count: room.room_count ?? 1,
          price_per_guest_night: room.price_per_guest_night,
          amenities: room.amenities ?? [],
          is_active: activate,
        }),
      });

      const result = await readJson<{ error?: string }>(response);

      if (!response.ok) {
        throw new Error(result.error || "Could not update room status.");
      }

      setMessage(
        `${room.room_name} ${activate ? "activated" : "deactivated"}.`,
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update room status.",
      );
    }
  }

  const visibleRooms = rooms.filter((room) => room.stay_slug === selectedStay);

  return (
    <section className="mt-10 border-t border-stone-200 pt-8">
      <h2 className="text-2xl font-bold tracking-tight">Room setup</h2>

      <p className="mt-2 text-sm text-stone-600">
        Configure room types, quantities, guest capacity, pricing and amenities
        for each homestay.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
        >
          {message}
        </div>
      )}

      {loading ? (
        <p className="py-6 text-sm text-stone-600">Loading rooms...</p>
      ) : homestays.length === 0 ? (
        <p className="mt-5 rounded-xl border border-stone-200 p-5 text-sm">
          No homestays found. Check the homestay settings API.
        </p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <label className="w-full max-w-md text-sm font-medium">
              Select homestay
              <select
                value={selectedStay}
                onChange={(event) => {
                  const slug = event.target.value;
                  setSelectedStay(slug);
                  setEditingId(null);
                  setForm({ ...blankForm, stay_slug: slug });
                  setError("");
                  setMessage("");
                }}
                className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5"
              >
                {homestays.map((stay) => (
                  <option key={stay.stay_slug} value={stay.stay_slug}>
                    {stay.display_name}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white"
            >
              + Add room
            </button>
          </div>

          <div className="mt-5 grid gap-4">
            {visibleRooms.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-300 p-6 text-sm text-stone-600">
                No rooms have been added for this homestay yet.
              </div>
            ) : (
              visibleRooms.map((room) => (
                <article
                  key={room.id}
                  className="rounded-xl border border-stone-200 bg-white p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">
                          {room.room_name}
                        </h3>
                        <span className="text-xs text-stone-600">
                          {room.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-stone-600">
                        Number of identical rooms: {room.room_count ?? 1}
                      </p>

                      <p className="mt-1 text-sm text-stone-600">
                        Capacity per room: {room.max_guests} guests
                      </p>

                      <p className="mt-1 text-sm text-stone-600">
                        {room.price_per_guest_night == null
                          ? "Uses homestay base price per guest per night"
                          : `₹${Number(room.price_per_guest_night).toLocaleString("en-IN")} per guest per night`}
                      </p>

                      {room.description && (
                        <p className="mt-2 text-sm text-stone-600">
                          {room.description}
                        </p>
                      )}

                      {(room.amenities ?? []).length > 0 && (
                        <p className="mt-2 text-sm text-stone-600">
                          Amenities: {room.amenities.join(", ")}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => editRoom(room)}
                        className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => void toggleRoom(room)}
                        className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                      >
                        {room.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>

          <form
            onSubmit={saveRoom}
            className="mt-8 rounded-2xl border border-stone-200 bg-white p-5 sm:p-7"
          >
            <h3 className="mb-5 text-xl font-semibold">
              {editingId ? "Edit room type" : "Add room type"}
            </h3>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Homestay
                <select
                  required
                  value={form.stay_slug}
                  onChange={(event) =>
                    setForm({ ...form, stay_slug: event.target.value })
                  }
                  className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 font-normal"
                >
                  {homestays.map((stay) => (
                    <option key={stay.stay_slug} value={stay.stay_slug}>
                      {stay.display_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium">
                Room type name
                <input
                  required
                  maxLength={100}
                  value={form.room_name}
                  onChange={(event) =>
                    setForm({ ...form, room_name: event.target.value })
                  }
                  placeholder="e.g. Garden View Room"
                  className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2.5 font-normal"
                />
              </label>

              <label className="text-sm font-medium">
                Number of identical rooms
                <input
                  required
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={form.room_count}
                  onChange={(event) =>
                    setForm({ ...form, room_count: event.target.value })
                  }
                  className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2.5 font-normal"
                />
                <span className="mt-1 block font-normal text-stone-500">
                  Example: enter 4 if you have four rooms of this same type.
                </span>
              </label>

              <label className="text-sm font-medium">
                Maximum guests per room
                <input
                  required
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={form.max_guests}
                  onChange={(event) =>
                    setForm({ ...form, max_guests: event.target.value })
                  }
                  className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2.5 font-normal"
                />
              </label>

              <label className="text-sm font-medium">
                Price per guest per night (₹)
                <input
                  type="number"
                  min="0"
                  max="10000000"
                  step="0.01"
                  value={form.price_per_guest_night}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      price_per_guest_night: event.target.value,
                    })
                  }
                  placeholder="Blank = homestay base price"
                  className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2.5 font-normal"
                />
                <span className="mt-1 block font-normal text-stone-500">
                  Leave blank to use the homestay&apos;s base price.
                </span>
              </label>

              <label className="text-sm font-medium sm:col-span-2">
                Description
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  placeholder="Describe this room type"
                  className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2.5 font-normal"
                />
              </label>

              <label className="text-sm font-medium sm:col-span-2">
                Amenities
                <input
                  value={form.amenities}
                  onChange={(event) =>
                    setForm({ ...form, amenities: event.target.value })
                  }
                  placeholder="Wi-Fi, Attached bathroom, Balcony"
                  className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2.5 font-normal"
                />
                <span className="mt-1 block font-normal text-stone-500">
                  Separate amenities with commas.
                </span>
              </label>

              <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    setForm({ ...form, is_active: event.target.checked })
                  }
                />
                Room type is active and available to offer for booking
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold"
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save changes"
                    : "Add room type"}
              </button>
            </div>
          </form>
        </>
      )}
    </section>
  );
}
