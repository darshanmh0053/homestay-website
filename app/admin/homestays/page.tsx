"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import PhotoUpload from "./PhotoUpload";

type FoodOption = "meals" | "breakfast" | "confirm";

type Stay = {
  slug: string;
  name: string;
  location: string;
  price_per_night: number;
  cover_image: string;
  tag: string;
  gallery_images: string[];
  amenities: string[];
  food: FoodOption;
  experiences: string[];
  is_active: boolean;
};

type UploadedPhoto = {
  path: string;
  url: string;
};

type ApiResult = Record<string, unknown>;

const emptyStay: Stay = {
  slug: "",
  name: "",
  location: "",
  price_per_night: 0,
  cover_image: "",
  tag: "",
  gallery_images: [],
  amenities: [],
  food: "confirm",
  experiences: [],
  is_active: true,
};

const inputClass =
  "mt-2 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-base font-normal text-stone-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

function splitLines(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

async function readApiResponse(response: Response): Promise<ApiResult> {
  try {
    const data: unknown = await response.json();

    if (data && typeof data === "object" && !Array.isArray(data)) {
      return data as ApiResult;
    }
  } catch {
    // The server may return a non-JSON error response.
  }

  return {};
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function getListings(data: ApiResult): Stay[] {
  const listings = data.listings ?? data.stays ?? data;

  if (!Array.isArray(listings)) {
    throw new Error("The API returned an unexpected homestay list.");
  }

  return listings as Stay[];
}

export default function HomestaysAdminPage() {
  const [stays, setStays] = useState<Stay[]>([]);
  const [form, setForm] = useState<Stay>({ ...emptyStay });
  const [editingSlug, setEditingSlug] = useState<string | null>(null);

  const [galleryText, setGalleryText] = useState("");
  const [amenitiesText, setAmenitiesText] = useState("");
  const [experiencesText, setExperiencesText] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingSlug, setUpdatingSlug] = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);

  const loadStays = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/admin/homestay-listings", {
      cache: "no-store",
      signal,
    });

    const data = await readApiResponse(response);

    if (!response.ok) {
      throw new Error(
        typeof data.error === "string"
          ? data.error
          : "Could not load homestays.",
      );
    }

    setStays(getListings(data));
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchInitialStays() {
      try {
        await loadStays(controller.signal);
      } catch (error) {
        if (!controller.signal.aborted) {
          setMessage(getErrorMessage(error));
          setMessageIsError(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void fetchInitialStays();

    return () => controller.abort();
  }, [loadStays]);

  function showMessage(text: string, isError = false) {
    setMessage(text);
    setMessageIsError(isError);
  }

  function startNew() {
    setEditingSlug(null);
    setForm({ ...emptyStay });
    setGalleryText("");
    setAmenitiesText("");
    setExperiencesText("");
    showMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startEdit(stay: Stay) {
    setEditingSlug(stay.slug);

    setForm({
      ...stay,
      price_per_night: Number(stay.price_per_night),
      gallery_images: [...(stay.gallery_images ?? [])],
      amenities: [...(stay.amenities ?? [])],
      experiences: [...(stay.experiences ?? [])],
    });

    setGalleryText((stay.gallery_images ?? []).join("\n"));
    setAmenitiesText((stay.amenities ?? []).join("\n"));
    setExperiencesText((stay.experiences ?? []).join("\n"));

    showMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCoverUploaded(photo: UploadedPhoto) {
    setForm((current) => ({
      ...current,
      cover_image: photo.url,
    }));

    showMessage(
      "Cover photo uploaded. Save changes to store its URL in the listing.",
    );
  }

  function handleGalleryUploaded(photo: UploadedPhoto) {
    setGalleryText((current) => {
      const existing = splitLines(current);

      if (existing.includes(photo.url)) {
        return current;
      }

      return [...existing, photo.url].join("\n");
    });

    showMessage(
      "Gallery photo uploaded. Save changes to store its URL in the listing.",
    );
  }

  async function saveStay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    const slug = editingSlug ?? form.slug.trim().toLowerCase();
    const price = Number(form.price_per_night);

    if (!isValidSlug(slug)) {
      showMessage(
        "Use lowercase letters, numbers and single hyphens for the URL slug.",
        true,
      );
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      showMessage("Enter a valid, non-negative display price.", true);
      return;
    }

    if (!form.name.trim() || !form.location.trim()) {
      showMessage("Enter both the homestay name and location.", true);
      return;
    }

    setSaving(true);
    showMessage("");

    const payload: Stay = {
      ...form,
      slug,
      name: form.name.trim(),
      location: form.location.trim(),
      cover_image: form.cover_image.trim(),
      tag: form.tag.trim(),
      price_per_night: price,
      gallery_images: splitLines(galleryText),
      amenities: splitLines(amenitiesText),
      experiences: splitLines(experiencesText),
    };

    try {
      const response = await fetch("/api/admin/homestay-listings", {
        method: editingSlug ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Could not save the homestay.",
        );
      }

      const savedListing = (data.listing ?? payload) as Stay;

      await loadStays();

      setEditingSlug(savedListing.slug);
      setForm({
        ...payload,
        ...savedListing,
        price_per_night: Number(savedListing.price_per_night),
        gallery_images: [
          ...(savedListing.gallery_images ?? payload.gallery_images),
        ],
        amenities: [...(savedListing.amenities ?? payload.amenities)],
        experiences: [...(savedListing.experiences ?? payload.experiences)],
      });

      setGalleryText(
        (savedListing.gallery_images ?? payload.gallery_images).join("\n"),
      );
      setAmenitiesText(
        (savedListing.amenities ?? payload.amenities).join("\n"),
      );
      setExperiencesText(
        (savedListing.experiences ?? payload.experiences).join("\n"),
      );

      showMessage(
        editingSlug
          ? "Homestay updated successfully."
          : "Homestay created successfully. You can now upload its photos.",
      );
    } catch (error) {
      showMessage(getErrorMessage(error), true);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(stay: Stay) {
    if (updatingSlug !== null) return;

    setUpdatingSlug(stay.slug);
    showMessage("");

    try {
      const response = await fetch("/api/admin/homestay-listings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...stay,
          is_active: !stay.is_active,
        }),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Could not update listing status.",
        );
      }

      await loadStays();

      showMessage(
        `${stay.name} is now ${stay.is_active ? "inactive" : "active"}.`,
      );
    } catch (error) {
      showMessage(getErrorMessage(error), true);
    } finally {
      setUpdatingSlug(null);
    }
  }

  async function permanentlyDeleteStay(stay: Stay) {
    if (deletingSlug !== null || updatingSlug !== null || saving) return;

    const confirmation = window.confirm(
      `PERMANENTLY DELETE \"${stay.name}\"?\n\nThis will delete the listing, booking enquiries and holds, rooms, meals, amenities, settings, and uploaded photos from storage. This cannot be undone.\n\nChoose Cancel to keep this homestay.`,
    );
    if (!confirmation) return;

    setDeletingSlug(stay.slug);
    showMessage("");

    try {
      const response = await fetch(
        `/api/admin/homestay-listings/${encodeURIComponent(stay.slug)}`,
        { method: "DELETE", cache: "no-store" },
      );
      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Could not permanently delete the homestay.",
        );
      }

      setStays((current) => current.filter((item) => item.slug !== stay.slug));
      if (editingSlug === stay.slug) startNew();
      showMessage(
        typeof data.message === "string"
          ? data.message
          : `${stay.name} was permanently deleted.`,
      );
    } catch (error) {
      showMessage(getErrorMessage(error), true);
    } finally {
      setDeletingSlug(null);
    }
  }

  async function refreshStays() {
    setLoading(true);
    showMessage("");

    try {
      await loadStays();
    } catch (error) {
      showMessage(getErrorMessage(error), true);
    } finally {
      setLoading(false);
    }
  }

  const uploadSlug = editingSlug ?? "";
  const galleryImages = splitLines(galleryText);

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-5 text-stone-900 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:mb-8 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800 sm:text-sm">
                Malnad Nest Homestay
              </p>

              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Manage Homestays
              </h1>

              <p className="mt-2 text-sm leading-6 text-stone-600">
                Manage property details, photos, amenities and visibility.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
              <Link
                href="/admin"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
              >
                ← Back to Dashboard
              </Link>

              <button
                type="button"
                onClick={startNew}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900"
              >
                + Add Homestay
              </button>
            </div>
          </div>
        </header>

        {message && (
          <div
            role={messageIsError ? "alert" : "status"}
            className={`mb-6 rounded-xl border p-4 text-sm leading-6 ${
              messageIsError
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-900"
            }`}
          >
            {message}
          </div>
        )}

        <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:mb-10 sm:p-7">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">
              {editingSlug ? "Edit Homestay" : "Add a Homestay"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              Fields marked by the browser as required must be completed before
              saving.
            </p>
          </div>

          <form onSubmit={saveStay} className="space-y-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <label className="block text-sm font-medium text-stone-700">
                Homestay name
                <input
                  required
                  maxLength={150}
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  className={inputClass}
                />
              </label>

              <label className="block text-sm font-medium text-stone-700">
                URL slug
                <input
                  required
                  disabled={Boolean(editingSlug)}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  maxLength={150}
                  placeholder="example-homestay"
                  value={form.slug}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      slug: event.target.value
                        .toLowerCase()
                        .replace(/\s+/g, "-"),
                    })
                  }
                  className={`${inputClass} disabled:bg-stone-100`}
                />
                <span className="mt-1 block text-xs font-normal leading-5 text-stone-500">
                  Lowercase letters, numbers and single hyphens only. The slug
                  cannot be changed after creation.
                </span>
              </label>

              <label className="block text-sm font-medium text-stone-700">
                Location
                <input
                  required
                  maxLength={200}
                  value={form.location}
                  onChange={(event) =>
                    setForm({ ...form, location: event.target.value })
                  }
                  className={inputClass}
                />
              </label>

              <label className="block text-sm font-medium text-stone-700">
                Display price per night (₹)
                <input
                  required
                  type="number"
                  min="0"
                  max="10000000"
                  step="0.01"
                  value={form.price_per_night}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      price_per_night:
                        event.target.value === ""
                          ? 0
                          : Number(event.target.value),
                    })
                  }
                  className={inputClass}
                />
                <span className="mt-1 block text-xs font-normal leading-5 text-stone-500">
                  This price appears on the listing. Booking room rates are
                  configured separately.
                </span>
              </label>

              <label className="block text-sm font-medium text-stone-700 sm:col-span-2">
                Cover image URL or path
                <input
                  maxLength={2048}
                  placeholder="Optional: /images/example/cover.jpeg or https://..."
                  value={form.cover_image}
                  onChange={(event) =>
                    setForm({ ...form, cover_image: event.target.value })
                  }
                  className={inputClass}
                />
                <span className="mt-1 block text-xs font-normal leading-5 text-stone-500">
                  Optional. You can create the homestay first and upload or add
                  a cover image later.
                </span>
              </label>

              <div className="rounded-xl border border-stone-200 p-4 sm:col-span-2 sm:p-5">
                <p className="mb-3 text-sm font-semibold text-stone-800">
                  Upload cover photo
                </p>

                <PhotoUpload
                  slug={uploadSlug}
                  photoType="cover"
                  onUploaded={handleCoverUploaded}
                />

                {!uploadSlug && (
                  <p className="mt-3 text-xs leading-5 text-amber-800">
                    Create the homestay first. After saving, you can upload its
                    cover photo without leaving this page.
                  </p>
                )}
              </div>

              {form.cover_image.trim() && (
                <div className="sm:col-span-2">
                  <p className="mb-2 text-xs font-medium text-stone-500">
                    Cover preview
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.cover_image}
                    alt="Homestay cover preview"
                    className="h-48 w-full rounded-xl border border-stone-200 object-cover sm:h-64"
                  />
                </div>
              )}

              <label className="block text-sm font-medium text-stone-700">
                Listing tag
                <input
                  maxLength={80}
                  value={form.tag}
                  onChange={(event) =>
                    setForm({ ...form, tag: event.target.value })
                  }
                  placeholder="NATURE ESCAPE"
                  className={inputClass}
                />
              </label>

              <label className="block text-sm font-medium text-stone-700">
                Food option
                <select
                  value={form.food}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      food: event.target.value as FoodOption,
                    })
                  }
                  className={inputClass}
                >
                  <option value="meals">Meals included</option>
                  <option value="breakfast">Breakfast</option>
                  <option value="confirm">Confirm with host</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-stone-700 sm:col-span-2">
                Gallery image URLs or paths
                <span className="mt-1 block text-xs font-normal leading-5 text-stone-500">
                  Enter one image URL or path per line.
                </span>
                <textarea
                  rows={4}
                  value={galleryText}
                  onChange={(event) => setGalleryText(event.target.value)}
                  placeholder={"/images/example/room.jpeg\nhttps://..."}
                  className={inputClass}
                />
              </label>

              <div className="rounded-xl border border-stone-200 p-4 sm:col-span-2 sm:p-5">
                <p className="mb-3 text-sm font-semibold text-stone-800">
                  Upload gallery photo
                </p>

                <PhotoUpload
                  slug={uploadSlug}
                  photoType="gallery"
                  onUploaded={handleGalleryUploaded}
                />

                <p className="mt-3 text-xs leading-5 text-stone-500">
                  After uploading, save the listing to store the photo URL.
                </p>
              </div>

              {galleryImages.length > 0 && (
                <div className="sm:col-span-2">
                  <p className="mb-3 text-sm font-semibold text-stone-700">
                    Gallery preview ({galleryImages.length})
                  </p>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {galleryImages.map((url, index) => (
                      <div
                        key={`${url}-${index}`}
                        className="min-w-0 overflow-hidden rounded-xl border border-stone-200 p-2"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Gallery photo ${index + 1}`}
                          className="h-28 w-full rounded-lg object-cover sm:h-36"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setGalleryText((current) =>
                              current
                                .split("\n")
                                .filter((item) => item.trim() !== url)
                                .join("\n"),
                            )
                          }
                          className="mt-2 min-h-9 text-left text-xs font-semibold text-red-700 underline"
                        >
                          Remove photo
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <label className="block text-sm font-medium text-stone-700">
                Amenities
                <span className="mt-1 block text-xs font-normal leading-5 text-stone-500">
                  Enter one amenity per line.
                </span>
                <textarea
                  rows={4}
                  value={amenitiesText}
                  onChange={(event) => setAmenitiesText(event.target.value)}
                  placeholder={"Wi-Fi\nParking\nHot water"}
                  className={inputClass}
                />
              </label>

              <label className="block text-sm font-medium text-stone-700">
                Experiences
                <span className="mt-1 block text-xs font-normal leading-5 text-stone-500">
                  Enter one experience per line.
                </span>
                <textarea
                  rows={4}
                  value={experiencesText}
                  onChange={(event) => setExperiencesText(event.target.value)}
                  placeholder={"Nature walks\nCampfire"}
                  className={inputClass}
                />
              </label>
            </div>

            <label className="flex min-h-12 items-center gap-3 rounded-xl bg-stone-50 p-3 text-sm font-medium text-stone-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  setForm({ ...form, is_active: event.target.checked })
                }
                className="h-5 w-5 accent-emerald-700"
              />
              Make this homestay visible on the website
            </label>

            <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
              <button
                type="submit"
                disabled={saving}
                className="min-h-12 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingSlug
                    ? "Save Changes"
                    : "Create Homestay"}
              </button>

              <button
                type="button"
                onClick={startNew}
                disabled={saving}
                className="min-h-12 rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
              >
                Clear Form
              </button>
            </div>

            {!editingSlug && (
              <p className="text-xs leading-5 text-stone-500">
                Once the homestay is created, the form stays open so you can
                upload its photos.
              </p>
            )}
          </form>
        </section>

        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-stone-900">
                Existing Homestays
              </h2>
              <p className="mt-1 text-sm text-stone-600">
                Edit a property or change whether it is visible on the website.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void refreshStays()}
              disabled={loading}
              className="min-h-11 rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh list"}
            </button>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
              Loading homestays...
            </div>
          ) : stays.length === 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <p className="font-semibold text-stone-900">No homestays found</p>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Add a homestay above, or check that the admin listings API is
                returning your existing listings.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {stays.map((stay) => (
                <article
                  key={stay.slug}
                  className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={stay.cover_image}
                    alt={stay.name}
                    className="h-48 w-full object-cover sm:h-56"
                  />

                  <div className="space-y-4 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words text-lg font-semibold text-stone-900">
                          {stay.name}
                        </h3>
                        <p className="mt-1 text-sm text-stone-600">
                          {stay.location}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                          stay.is_active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-stone-100 text-stone-600"
                        }`}
                      >
                        {stay.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <p className="font-semibold text-stone-800">
                      ₹{Number(stay.price_per_night).toLocaleString("en-IN")}{" "}
                      <span className="text-sm font-normal text-stone-500">
                        / night (display price)
                      </span>
                    </p>

                    <p className="break-all text-xs text-stone-500">
                      URL slug: {stay.slug}
                    </p>

                    <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
                      <button
                        type="button"
                        onClick={() => startEdit(stay)}
                        className="min-h-11 rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
                      >
                        Edit Details
                      </button>

                      <button
                        type="button"
                        onClick={() => void toggleActive(stay)}
                        disabled={updatingSlug !== null}
                        className="min-h-11 rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {updatingSlug === stay.slug
                          ? "Updating..."
                          : stay.is_active
                            ? "Deactivate"
                            : "Activate"}
                      </button>

                      <button
                        type="button"
                        onClick={() => void permanentlyDeleteStay(stay)}
                        disabled={
                          deletingSlug !== null ||
                          updatingSlug !== null ||
                          saving
                        }
                        className="min-h-11 rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingSlug === stay.slug
                          ? "Deleting..."
                          : "Delete Permanently"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-8 border-t border-stone-200 py-5 text-center">
          <Link
            href="/admin"
            className="text-sm font-semibold text-emerald-800 hover:underline"
          >
            ← Back to Dashboard
          </Link>
        </footer>
      </div>
    </main>
  );
}
