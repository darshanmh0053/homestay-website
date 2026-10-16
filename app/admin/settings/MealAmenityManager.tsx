"use client";

import { useCallback, useEffect, useState } from "react";

type Homestay = {
  stay_slug: string;
  display_name: string;
};

type Meal = {
  id: string;
  stay_slug: string;
  meal_name: string;
  description: string;
  price_per_guest: number;
  pricing_unit: "per_meal" | "per_day" | "per_night" | "per_stay";
  is_active: boolean;
};

type Amenity = {
  id: string;
  stay_slug: string;
  amenity_name: string;
  description: string;
  price: number;
  pricing_unit:
    | "included"
    | "per_guest"
    | "per_night"
    | "per_guest_night"
    | "per_booking";
  is_active: boolean;
};

type FormState = {
  name: string;
  description: string;
  price: string;
  unit: string;
  is_active: boolean;
};

const MEAL_UNITS = [
  { value: "per_meal", label: "Per guest, per meal" },
  { value: "per_day", label: "Per guest, per day" },
  { value: "per_night", label: "Per guest, per night" },
  { value: "per_stay", label: "Per guest, per stay" },
] as const;

const AMENITY_UNITS = [
  { value: "included", label: "Included — free" },
  { value: "per_guest", label: "Per guest" },
  { value: "per_night", label: "Per night" },
  { value: "per_guest_night", label: "Per guest, per night" },
  { value: "per_booking", label: "Per booking" },
] as const;

const emptyForm: FormState = {
  name: "",
  description: "",
  price: "",
  unit: "per_meal",
  is_active: true,
};

function normalizePrice(value: string): number | null {
  if (value.trim() === "") return 0;

  const price = Number(value);

  if (!Number.isFinite(price) || price < 0 || price > 10_000_000) {
    return null;
  }

  return price;
}

export default function MealAmenityManager() {
  const [homestays, setHomestays] = useState<Homestay[]>([]);
  const [selectedStay, setSelectedStay] = useState("");
  const [meals, setMeals] = useState<Meal[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [activeTab, setActiveTab] = useState<"meals" | "amenities">("meals");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    const [settingsResponse, mealsResponse, amenitiesResponse] =
      await Promise.all([
        fetch("/api/admin/homestay-settings", { cache: "no-store" }),
        fetch("/api/admin/homestay-meals", { cache: "no-store" }),
        fetch("/api/admin/homestay-amenities", { cache: "no-store" }),
      ]);

    const settingsData = await settingsResponse.json();
    const mealsData = await mealsResponse.json();
    const amenitiesData = await amenitiesResponse.json();

    if (!settingsResponse.ok || !mealsResponse.ok || !amenitiesResponse.ok) {
      throw new Error(
        settingsData.error ||
          mealsData.error ||
          amenitiesData.error ||
          "Could not load meals and amenities.",
      );
    }

    const stays: Homestay[] = settingsData.settings ?? [];

    setHomestays(stays);
    setMeals(mealsData.meals ?? []);
    setAmenities(amenitiesData.amenities ?? []);

    setSelectedStay((current) =>
      stays.some((stay) => stay.stay_slug === current)
        ? current
        : (stays[0]?.stay_slug ?? ""),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const [settingsResponse, mealsResponse, amenitiesResponse] =
          await Promise.all([
            fetch("/api/admin/homestay-settings", { cache: "no-store" }),
            fetch("/api/admin/homestay-meals", { cache: "no-store" }),
            fetch("/api/admin/homestay-amenities", { cache: "no-store" }),
          ]);

        const settingsData = await settingsResponse.json();
        const mealsData = await mealsResponse.json();
        const amenitiesData = await amenitiesResponse.json();

        if (
          !settingsResponse.ok ||
          !mealsResponse.ok ||
          !amenitiesResponse.ok
        ) {
          throw new Error(
            settingsData.error ||
              mealsData.error ||
              amenitiesData.error ||
              "Could not load meals and amenities.",
          );
        }

        if (cancelled) return;

        const stays: Homestay[] = settingsData.settings ?? [];

        setHomestays(stays);
        setMeals(mealsData.meals ?? []);
        setAmenities(amenitiesData.amenities ?? []);
        setSelectedStay(stays[0]?.stay_slug ?? "");
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load meals and amenities.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  function startEdit(item: Meal | Amenity) {
    setEditingId(item.id);

    if ("meal_name" in item) {
      setActiveTab("meals");
      setForm({
        name: item.meal_name,
        description: item.description ?? "",
        price: String(item.price_per_guest ?? 0),
        unit: item.pricing_unit,
        is_active: item.is_active,
      });
    } else {
      setActiveTab("amenities");
      setForm({
        name: item.amenity_name,
        description: item.description ?? "",
        price: item.pricing_unit === "included" ? "" : String(item.price ?? 0),
        unit: item.pricing_unit,
        is_active: item.is_active,
      });
    }

    setError("");
    setMessage("");
  }

  function resetForm(tab = activeTab) {
    setEditingId(null);
    setForm({
      ...emptyForm,
      unit: tab === "meals" ? "per_meal" : "included",
    });
    setError("");
    setMessage("");
  }

  async function saveItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!selectedStay) {
      setError("Select a homestay first.");
      return;
    }

    if (!form.name.trim()) {
      setError("Enter a name.");
      return;
    }

    const isMeal = activeTab === "meals";

    const allowedUnits: readonly string[] = isMeal
      ? MEAL_UNITS.map((item) => item.value)
      : AMENITY_UNITS.map((item) => item.value);

    if (!allowedUnits.includes(form.unit)) {
      setError("Select a valid charging unit.");
      return;
    }

    const normalizedPrice = normalizePrice(form.price);

    if (normalizedPrice === null) {
      setError("Enter a valid price or leave it blank for free.");
      return;
    }

    const endpoint = isMeal
      ? "/api/admin/homestay-meals"
      : "/api/admin/homestay-amenities";

    const payload = isMeal
      ? {
          ...(editingId ? { id: editingId } : {}),
          stay_slug: selectedStay,
          meal_name: form.name.trim(),
          description: form.description.trim(),
          price_per_guest: normalizedPrice,
          pricing_unit: form.unit,
          is_active: form.is_active,
        }
      : {
          ...(editingId ? { id: editingId } : {}),
          stay_slug: selectedStay,
          amenity_name: form.name.trim(),
          description: form.description.trim(),
          price: form.unit === "included" ? 0 : normalizedPrice,
          pricing_unit: form.unit,
          is_active: form.is_active,
        };

    setSaving(true);

    try {
      const response = await fetch(endpoint, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not save the item.");
      }

      setMessage(
        `${form.name.trim()} ${editingId ? "updated" : "added"} successfully.`,
      );

      resetForm();

      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the item.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleItem(item: Meal | Amenity) {
    const isMeal = "meal_name" in item;
    const activating = !item.is_active;

    if (
      !window.confirm(`${activating ? "Activate" : "Deactivate"} this option?`)
    ) {
      return;
    }

    const payload = isMeal
      ? {
          id: item.id,
          stay_slug: item.stay_slug,
          meal_name: item.meal_name,
          description: item.description ?? "",
          price_per_guest: item.price_per_guest,
          pricing_unit: item.pricing_unit,
          is_active: activating,
        }
      : {
          id: item.id,
          stay_slug: item.stay_slug,
          amenity_name: item.amenity_name,
          description: item.description ?? "",
          price: item.pricing_unit === "included" ? 0 : (item.price ?? 0),
          pricing_unit: item.pricing_unit,
          is_active: activating,
        };

    setError("");
    setMessage("");

    try {
      const response = await fetch(
        isMeal ? "/api/admin/homestay-meals" : "/api/admin/homestay-amenities",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not update status.");
      }

      setMessage(
        `${isMeal ? item.meal_name : item.amenity_name} ${
          activating ? "activated" : "deactivated"
        }.`,
      );

      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status.");
    }
  }

  const visibleMeals = meals.filter((item) => item.stay_slug === selectedStay);
  const visibleAmenities = amenities.filter(
    (item) => item.stay_slug === selectedStay,
  );

  const visibleItems = activeTab === "meals" ? visibleMeals : visibleAmenities;

  return (
    <section className="mt-10 border-t border-stone-200 pt-8">
      <h2 className="text-2xl font-bold tracking-tight">
        Meals &amp; amenities
      </h2>

      <p className="mt-2 text-sm text-stone-600">
        Configure food options, activities and optional charges for each
        homestay.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {message}
        </div>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-stone-500">Loading options...</p>
      ) : (
        <>
          <label className="mt-6 block max-w-lg text-sm font-medium">
            Select homestay
            <select
              value={selectedStay}
              onChange={(event) => {
                setSelectedStay(event.target.value);
                resetForm();
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

          <div className="mt-6 flex flex-wrap gap-2 border-b border-stone-200">
            <button
              type="button"
              onClick={() => {
                setActiveTab("meals");
                resetForm("meals");
              }}
              className={`rounded-t-lg px-5 py-3 text-sm font-semibold ${
                activeTab === "meals"
                  ? "border-b-2 border-emerald-800 text-emerald-900"
                  : "text-stone-500"
              }`}
            >
              Meals ({visibleMeals.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("amenities");
                resetForm("amenities");
              }}
              className={`rounded-t-lg px-5 py-3 text-sm font-semibold ${
                activeTab === "amenities"
                  ? "border-b-2 border-emerald-800 text-emerald-900"
                  : "text-stone-500"
              }`}
            >
              Amenities &amp; activities ({visibleAmenities.length})
            </button>
          </div>

          <div className="mt-5 grid gap-3">
            {visibleItems.map((item) => {
              const isMeal = "meal_name" in item;
              const name = isMeal ? item.meal_name : item.amenity_name;
              const price = isMeal ? item.price_per_guest : item.price;
              const unit = item.pricing_unit.replaceAll("_", " ");

              return (
                <article
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{name}</h3>
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          item.is_active
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-stone-100 text-stone-500"
                        }`}
                      >
                        {item.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-medium">
                      {price === 0 && !isMeal
                        ? "Included — free"
                        : `₹${Number(price).toLocaleString("en-IN")} · ${unit}`}
                    </p>

                    {item.description && (
                      <p className="mt-1 text-sm text-stone-600">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleItem(item)}
                      className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    >
                      {item.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </article>
              );
            })}

            {visibleItems.length === 0 && (
              <p className="rounded-xl border border-dashed border-stone-300 p-5 text-sm text-stone-600">
                No options added yet. Use the form below to create one.
              </p>
            )}
          </div>

          <form
            onSubmit={saveItem}
            className="mt-7 rounded-2xl border border-stone-200 bg-white p-5 sm:p-7"
          >
            <h3 className="text-lg font-semibold">
              {editingId
                ? "Edit option"
                : activeTab === "meals"
                  ? "Add a meal option"
                  : "Add an amenity or activity"}
            </h3>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-medium">
                {activeTab === "meals"
                  ? "Meal name"
                  : "Amenity or activity name"}
                <input
                  required
                  maxLength={150}
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder={
                    activeTab === "meals" ? "e.g. Breakfast" : "e.g. Campfire"
                  }
                  className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2.5 font-normal"
                />
              </label>

              <label className="text-sm font-medium">
                Charging unit
                <select
                  required
                  value={form.unit}
                  onChange={(event) => {
                    const unit = event.target.value;
                    const validUnits =
                      activeTab === "meals"
                        ? MEAL_UNITS.map((item) => item.value)
                        : AMENITY_UNITS.map((item) => item.value);

                    if (validUnits.includes(unit as never)) {
                      setForm({ ...form, unit });
                    }
                  }}
                  className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 font-normal"
                >
                  {(activeTab === "meals" ? MEAL_UNITS : AMENITY_UNITS).map(
                    (unit) => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="text-sm font-medium">
                Price (₹)
                <input
                  type="number"
                  min="0"
                  max="10000000"
                  step="0.01"
                  value={form.unit === "included" ? "" : form.price}
                  disabled={form.unit === "included"}
                  onChange={(event) =>
                    setForm({ ...form, price: event.target.value })
                  }
                  placeholder="Leave blank for free"
                  className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2.5 font-normal disabled:bg-stone-100"
                />
                {activeTab === "amenities" && (
                  <span className="mt-1 block text-xs font-normal text-stone-500">
                    Leave blank to offer this option for free.
                  </span>
                )}
              </label>

              <label className="text-sm font-medium">
                Description
                <input
                  maxLength={1000}
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  placeholder="Optional details"
                  className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2.5 font-normal"
                />
              </label>

              <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    setForm({ ...form, is_active: event.target.checked })
                  }
                />
                Active and available to offer to guests
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              {editingId && (
                <button
                  type="button"
                  onClick={() => resetForm()}
                  className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold"
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                disabled={saving || homestays.length === 0}
                className="rounded-lg bg-emerald-800 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save changes"
                    : "Add option"}
              </button>
            </div>
          </form>
        </>
      )}
    </section>
  );
}
