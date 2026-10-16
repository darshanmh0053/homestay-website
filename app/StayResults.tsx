"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SEARCH_STORAGE_KEY, type StaySearchDetails } from "./StaySearch";

type PublicStay = {
  slug: string;
  name: string;
  location: string;
  pricePerNight: number;
  coverImage: string;
  tag: string;
};

type ApiStay = {
  slug: string;
  name: string;
  location: string;
  price_per_night: number | string;
  cover_image: string;
  tag: string;
};

type HomestaysResponse = {
  listings?: ApiStay[];
  error?: string;
};

const DEFAULT_SEARCH: StaySearchDetails = {
  destination: "",
  checkIn: "",
  checkOut: "",
};

function readSavedSearch(): StaySearchDetails {
  if (typeof window === "undefined") return DEFAULT_SEARCH;

  try {
    const saved = sessionStorage.getItem(SEARCH_STORAGE_KEY);
    if (!saved) return DEFAULT_SEARCH;

    const parsed = JSON.parse(saved) as Partial<StaySearchDetails>;

    return {
      destination: parsed.destination ?? "",
      checkIn: parsed.checkIn ?? "",
      checkOut: parsed.checkOut ?? "",
    };
  } catch {
    return DEFAULT_SEARCH;
  }
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(price);
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function isApiStay(value: unknown): value is ApiStay {
  if (!value || typeof value !== "object") return false;

  const item = value as Record<string, unknown>;
  const price = Number(item.price_per_night);

  return (
    typeof item.slug === "string" &&
    /^[a-z0-9]+(-[a-z0-9]+)*$/.test(item.slug) &&
    typeof item.name === "string" &&
    item.name.trim().length > 0 &&
    typeof item.location === "string" &&
    item.location.trim().length > 0 &&
    item.price_per_night !== null &&
    item.price_per_night !== "" &&
    Number.isFinite(price) &&
    price >= 0 &&
    typeof item.cover_image === "string" &&
    item.cover_image.trim().length > 0 &&
    typeof item.tag === "string"
  );
}

export default function StayResults() {
  const [stays, setStays] = useState<PublicStay[]>([]);
  const [search, setSearch] = useState<StaySearchDetails>(DEFAULT_SEARCH);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const retryLoading = useCallback(() => {
    setError("");
    setLoading(true);
    setReloadKey((current) => current + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchStays() {
      try {
        const response = await fetch("/api/public/homestays", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        let result: HomestaysResponse;

        try {
          result = (await response.json()) as HomestaysResponse;
        } catch {
          throw new Error("The homestay service returned an invalid response.");
        }

        if (!response.ok) {
          throw new Error(
            typeof result.error === "string"
              ? result.error
              : "Could not load homestays.",
          );
        }

        if (!Array.isArray(result.listings)) {
          throw new Error(
            "The homestay service returned an unexpected response.",
          );
        }

        const listings = result.listings.filter(isApiStay).map(
          (item): PublicStay => ({
            slug: item.slug,
            name: item.name.trim(),
            location: item.location.trim(),
            pricePerNight: Number(item.price_per_night),
            coverImage: item.cover_image.trim(),
            tag: item.tag.trim(),
          }),
        );

        if (!controller.signal.aborted) {
          setStays(listings);
          setError("");
        }
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error ? err.message : "Unable to load homestays.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void fetchStays();

    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    function handleSearchUpdate(event: Event) {
      if (
        event instanceof CustomEvent &&
        event.detail &&
        typeof event.detail === "object"
      ) {
        const details = event.detail as Partial<StaySearchDetails>;

        setSearch({
          destination: details.destination ?? "",
          checkIn: details.checkIn ?? "",
          checkOut: details.checkOut ?? "",
        });
        return;
      }

      setSearch(readSavedSearch());
    }

    function handleStorageChange(event: StorageEvent) {
      if (event.key === SEARCH_STORAGE_KEY) {
        setSearch(readSavedSearch());
      }
    }

    window.addEventListener("malnad-search-updated", handleSearchUpdate);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("malnad-search-updated", handleSearchUpdate);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const filteredStays = useMemo(() => {
    const destination = normalize(search.destination);

    if (!destination) return stays;

    return stays.filter((stay) => {
      const location = normalize(stay.location);
      const name = normalize(stay.name);

      if (destination.includes("chikkamagaluru")) {
        return (
          location.includes("chikkamagaluru") || name.includes("coffee grove")
        );
      }

      if (destination.includes("sakleshpur")) {
        return location.includes("sakleshpur") || name.includes("misty hills");
      }

      if (destination.includes("coorg")) {
        return (
          location.includes("coorg") ||
          location.includes("kodagu") ||
          name.includes("coorg")
        );
      }

      return location.includes(destination) || name.includes(destination);
    });
  }, [stays, search.destination]);

  const dateQuery = useMemo(() => {
    const params = new URLSearchParams();

    if (search.checkIn) params.set("checkIn", search.checkIn);
    if (search.checkOut) params.set("checkOut", search.checkOut);

    const query = params.toString();
    return query ? `?${query}` : "";
  }, [search.checkIn, search.checkOut]);

  const browseAllStays = useCallback(() => {
    const updatedSearch: StaySearchDetails = {
      ...search,
      destination: "",
    };

    setSearch(updatedSearch);

    try {
      sessionStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(updatedSearch));
    } catch {
      // Continue even if browser storage is unavailable.
    }

    window.dispatchEvent(
      new CustomEvent("malnad-search-updated", {
        detail: updatedSearch,
      }),
    );
  }, [search]);

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 lg:px-10">
      <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-[#9a7847]">
            Your next escape
          </p>

          <h2 className="font-serif text-4xl leading-tight text-[#263f30] sm:text-5xl">
            Stays worth slowing down for
          </h2>

          <p className="mt-4 text-sm leading-6 text-[#746f63]">
            From cosy cottages to coffee-estate hideaways, find a stay that
            feels like you.
          </p>
        </div>

        <Link
          href="/#contact"
          className="text-sm text-[#294333] underline underline-offset-4"
        >
          Need help choosing? Get in touch ↗
        </Link>
      </div>

      {loading && (
        <div role="status" className="py-12 text-center text-sm text-[#746f63]">
          Loading homestays...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-white p-6">
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>

          <button
            type="button"
            onClick={retryLoading}
            className="mt-4 rounded-full border border-[#294333] px-5 py-2 text-sm text-[#294333]"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && filteredStays.length === 0 && (
        <div className="rounded-xl border border-[#e3dfd3] bg-[#faf8f2] p-8 text-center">
          <h2 className="font-serif text-2xl text-[#263f30]">
            No stays found for this destination
          </h2>

          <p className="mt-3 text-sm text-[#746f63]">
            Try browsing all our available homestays.
          </p>

          <button
            type="button"
            onClick={browseAllStays}
            className="mt-5 rounded-full border border-[#294333] px-6 py-2.5 text-sm text-[#294333]"
          >
            View all stays
          </button>
        </div>
      )}

      {!loading && !error && filteredStays.length > 0 && (
        <div className="grid grid-cols-1 gap-7 md:grid-cols-2 xl:grid-cols-3">
          {filteredStays.map((stay) => (
            <article
              key={stay.slug}
              className="overflow-hidden rounded-2xl border border-[#e3dfd3] bg-[#faf8f2]"
            >
              <Link
                href={`/stays/${stay.slug}${dateQuery}`}
                className="group block"
              >
                <div className="relative h-64 overflow-hidden bg-[#e8e4d8]">
                  <img
                    src={stay.coverImage}
                    alt={stay.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {stay.tag && (
                    <span className="absolute left-4 top-4 rounded-full bg-[#faf8f2] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#294333]">
                      {stay.tag}
                    </span>
                  )}

                  <span className="absolute bottom-4 right-4 rounded-full bg-[#faf8f2] px-3 py-2 text-xs text-[#294333]">
                    {stay.location}
                  </span>
                </div>

                <div className="p-6">
                  <p className="text-xs uppercase tracking-wide text-[#9a7847]">
                    ✦ &nbsp; Nature · Comfort · Quiet
                  </p>

                  <h2 className="mt-3 font-serif text-2xl text-[#17392f]">
                    {stay.name}
                  </h2>

                  <p className="mt-2 text-sm text-[#746f63]">{stay.location}</p>
                </div>
              </Link>

              <div className="mx-6 border-t border-[#e3dfd3]" />

              <div className="flex items-center justify-between gap-3 p-6 pt-5">
                <p className="text-[#17392f]">
                  <span className="font-serif text-2xl font-semibold">
                    ₹{formatPrice(stay.pricePerNight)}
                  </span>
                  <span className="ml-1 text-xs text-[#746f63]">/ night</span>
                </p>

                <Link
                  href={`/stays/${stay.slug}${dateQuery}`}
                  className="shrink-0 rounded-full border border-[#6b806b] px-4 py-2 text-xs text-[#17392f] transition-colors hover:bg-[#294333] hover:text-white"
                >
                  View Stay ↗
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
