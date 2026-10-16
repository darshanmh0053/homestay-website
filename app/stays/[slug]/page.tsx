import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "../../../lib/supabase-service";
import PhotoGallery from "./PhotoGallery";
export const instant = false;

type FoodOption = "meals" | "breakfast" | "confirm";

type Stay = {
  slug: string;
  name: string;
  location: string;
  pricePerNight: number;
  coverImage: string;
  tag: string;
  galleryImages: string[];
  amenities: string[];
  food: FoodOption;
  experiences: string[];
};

type ListingRow = {
  slug: string;
  name: string;
  location: string;
  price_per_night: number | string;
  cover_image: string;
  tag: string | null;
  gallery_images: string[] | null;
  amenities: string[] | null;
  food: FoodOption | null;
  experiences: string[] | null;
  is_active: boolean;
};

type RelatedListingRow = {
  slug: string;
  name: string;
  location: string;
  price_per_night: number | string;
  cover_image: string;
  tag: string | null;
};

function getFoodLabel(food: FoodOption) {
  switch (food) {
    case "meals":
      return "Meals available";
    case "breakfast":
      return "Breakfast available";
    case "confirm":
      return "Please confirm food arrangements";
  }
}

const amenityDetails: Record<string, { icon: string; detail: string }> = {
  "Wi-Fi": { icon: "📶", detail: "Stay connected" },
  "Hot water": { icon: "🚿", detail: "Hot water facility" },
  Parking: { icon: "🚗", detail: "Parking available" },
  "Attached bathroom": {
    icon: "🛁",
    detail: "Attached bathroom",
  },
  "Power backup": { icon: "🔌", detail: "Backup power" },
};

const experienceIcons: Record<string, string> = {
  "Nature walks": "🌿",
  "Coffee plantation walks": "☕",
  Campfire: "🔥",
  "Local sightseeing assistance": "🧭",
};

function mapListing(row: ListingRow): Stay {
  return {
    slug: row.slug,
    name: row.name,
    location: row.location,
    pricePerNight: Number(row.price_per_night),
    coverImage: row.cover_image,
    tag: row.tag ?? "",
    galleryImages: row.gallery_images ?? [],
    amenities: row.amenities ?? [],
    food: row.food ?? "confirm",
    experiences: row.experiences ?? [],
  };
}

function mapRelatedListing(row: RelatedListingRow): Stay {
  return {
    slug: row.slug,
    name: row.name,
    location: row.location,
    pricePerNight: Number(row.price_per_night),
    coverImage: row.cover_image,
    tag: row.tag ?? "",
    galleryImages: [],
    amenities: [],
    food: "confirm",
    experiences: [],
  };
}

async function getStay(slug: string): Promise<Stay | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("homestay_listings")
    .select(
      "slug, name, location, price_per_night, cover_image, tag, gallery_images, amenities, food, experiences, is_active",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Could not load homestay details:", error.message);
    throw new Error("Could not load homestay details.");
  }

  if (!data) return null;

  return mapListing(data as ListingRow);
}

async function getOtherStays(currentSlug: string): Promise<Stay[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("homestay_listings")
    .select("slug, name, location, price_per_night, cover_image, tag")
    .eq("is_active", true)
    .neq("slug", currentSlug)
    .order("name", { ascending: true });

  if (error) {
    console.error("Could not load related homestays:", error.message);
    return [];
  }

  return ((data ?? []) as RelatedListingRow[]).map(mapRelatedListing);
}

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    checkIn?: string;
    checkOut?: string;
  }>;
};

export default async function StayDetailsPage({ params, searchParams }: Props) {
  const [{ slug }, { checkIn, checkOut }] = await Promise.all([
    params,
    searchParams,
  ]);

  // These database reads are independent, so run them concurrently.
  const [stay, otherStays] = await Promise.all([
    getStay(slug),
    getOtherStays(slug),
  ]);

  if (!stay) notFound();

  const photos = stay.galleryImages.length
    ? stay.galleryImages
    : [stay.coverImage];

  const bookingParams = new URLSearchParams();

  if (checkIn) bookingParams.set("checkIn", checkIn);
  if (checkOut) bookingParams.set("checkOut", checkOut);

  const bookingUrl = `/book/${stay.slug}${
    bookingParams.size > 0 ? `?${bookingParams.toString()}` : ""
  }`;

  return (
    <main className="min-h-screen bg-[#fbfaf6] pb-24 font-sans text-[#203b2b] antialiased lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-[#e4dfd2] bg-[#fbfaf6]/95 px-5 py-4 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="font-serif text-2xl font-semibold">
            Malnad Nest
          </Link>
          <Link href="/" className="text-sm hover:underline">
            Explore stays
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 lg:py-10">
        <Link href="/" className="text-sm text-[#77796c] hover:underline">
          ← All homestays
        </Link>

        <div className="mb-6 mt-6">
          <p className="text-xs font-semibold tracking-[0.22em] text-[#8a7855]">
            {stay.tag}
          </p>

          <h1 className="mt-3 max-w-4xl font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-[#203b2b] sm:text-6xl">
            {stay.name}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e9ecdf] text-[#426448]"
            >
              ⌖
            </span>
            <p className="text-sm font-medium text-[#555f52] sm:text-base">
              {stay.location}
            </p>
          </div>

          <div className="mt-6 h-px w-16 bg-[#b9a47b]" />
        </div>

        <PhotoGallery photos={photos} stayName={stay.name} />

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
          <section className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.2em] text-[#8a7855]">
              SLOW DOWN. BREATHE. UNWIND.
            </p>

            <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-[#203b2b] sm:text-4xl">
              Your Malnad escape awaits
            </h2>

            <p className="mt-4 max-w-2xl text-base leading-8 text-[#4f5b4e] sm:text-[17px]">
              Escape to the peaceful landscapes of Malnad. Enjoy a relaxing stay
              surrounded by nature, fresh air, and the beauty of
              Karnataka&apos;s Western Ghats. Browse the property photos and
              contact us to enquire about your preferred dates.
            </p>

            <div className="my-8 border-t border-[#e4dfd2]" />

            <h2 className="font-serif text-2xl font-semibold tracking-tight text-[#203b2b] sm:text-3xl">
              Plan your stay
            </h2>
            <ul className="mt-4 space-y-3 leading-7 text-[#62685d]">
              <li>• Choose your preferred travel dates.</li>
              <li>• Tell us how many guests will be staying.</li>
              <li>• Send your enquiry through WhatsApp.</li>
              <li>• Wait for availability and final pricing confirmation.</li>
            </ul>

            <p className="mt-6 text-sm leading-6 text-[#77796c]">
              Need details about meals, facilities, or house rules? Include your
              questions in the booking enquiry before making a decision.
            </p>

            <section className="mt-10 border-t border-[#e4dfd2] pt-8">
              <p className="text-xs font-semibold tracking-[0.2em] text-[#8a7855]">
                COMFORT & CONVENIENCE
              </p>

              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-[#203b2b] sm:text-4xl">
                Amenities
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#77796c]">
                Facilities available at this property.
              </p>

              {stay.amenities.length > 0 ? (
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                  {stay.amenities.map((amenity) => {
                    const details = amenityDetails[amenity];

                    return (
                      <div
                        key={amenity}
                        className="rounded-2xl border border-[#e4dfd2] bg-white p-4 transition duration-200 hover:-translate-y-1 hover:shadow-md sm:p-5"
                      >
                        <span className="text-2xl" aria-hidden="true">
                          {details?.icon ?? "✓"}
                        </span>

                        <h3 className="mt-3 font-semibold leading-5">
                          {amenity}
                        </h3>

                        {details && (
                          <p className="mt-2 text-sm leading-5 text-[#77796c]">
                            {details.detail}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 text-sm text-[#77796c]">
                  Amenities have not been listed yet.
                </p>
              )}

              <div className="mt-5 rounded-2xl bg-[#edf2e8] p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden="true">
                    🍽️
                  </span>
                  <div>
                    <h3 className="font-semibold">Food arrangements</h3>
                    <p className="mt-2 text-sm leading-6 text-[#526653]">
                      {getFoodLabel(stay.food)}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-10 border-t border-[#e4dfd2] pt-8">
              <p className="text-xs font-semibold tracking-[0.2em] text-[#8a7855]">
                MAKE YOUR STAY MEMORABLE
              </p>

              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-[#203b2b] sm:text-4xl">
                Experiences
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#77796c]">
                Explore the experiences listed for your chosen homestay.
              </p>

              {stay.experiences.length > 0 ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {stay.experiences.map((experience) => (
                    <div
                      key={experience}
                      className="flex items-start gap-3 rounded-2xl border border-[#e4dfd2] bg-white p-4 transition hover:border-[#b9c4ad] hover:shadow-sm"
                    >
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf2e8] text-xl"
                        aria-hidden="true"
                      >
                        {experienceIcons[experience] ?? "✦"}
                      </span>

                      <p className="pt-2 text-sm font-medium leading-6 text-[#294532]">
                        {experience}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-[#77796c]">
                  No experiences are currently listed for this property.
                </p>
              )}

              <p className="mt-5 rounded-xl bg-[#edf2e8] p-4 text-sm leading-6 text-[#526653]">
                Please enquire about experience availability and any additional
                costs before your visit.
              </p>
            </section>

            <section className="mt-10 border-t border-[#e4dfd2] pt-8">
              <h2 className="font-serif text-2xl font-semibold tracking-tight text-[#203b2b] sm:text-3xl">
                A few things to know
              </h2>

              <ul className="mt-4 space-y-3 text-sm leading-6 text-[#62685d]">
                <li>✓ Confirm your dates and guest count with us.</li>
                <li>✓ Ask about meals and any dietary requirements.</li>
                <li>
                  ✓ Confirm which activities are available at this property.
                </li>
                <li>
                  ✓ Check final pricing and any additional charges before
                  confirming.
                </li>
              </ul>
            </section>
          </section>

          <aside className="h-fit lg:sticky lg:top-24">
            <div className="rounded-3xl border border-[#e2dfd3] bg-white p-6 shadow-[0_18px_45px_rgba(35,55,39,0.10)] sm:p-7">
              <p className="text-sm text-[#77796c]">Stay at</p>
              <h2 className="mt-1 font-serif text-2xl font-semibold leading-snug tracking-tight text-[#203b2b]">
                {stay.name}
              </h2>

              <p className="mt-5 text-4xl font-bold tracking-tight text-[#203b2b]">
                ₹{stay.pricePerNight.toLocaleString("en-IN")}
                <span className="text-sm font-normal text-[#77796c]">
                  {" "}
                  / night
                </span>
              </p>

              <p className="mt-2 text-xs leading-5 text-[#77796c]">
                Final price and availability will be confirmed for your dates.
              </p>

              <Link
                href={bookingUrl}
                prefetch={true}
                className="mt-6 flex min-h-14 w-full items-center justify-center rounded-xl bg-[#294532] px-5 py-4 text-base font-semibold text-white shadow-md shadow-[#294532]/15 transition duration-200 hover:-translate-y-0.5 hover:bg-[#203827] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9a47b] focus-visible:ring-offset-2"
              >
                Check Availability →
              </Link>

              <p className="mt-4 text-center text-xs leading-5 text-[#77796c]">
                Booking enquiry only. Your stay is not confirmed until we
                confirm availability.
              </p>
            </div>
          </aside>
        </div>

        <section className="mt-16 border-t border-[#e4dfd2] pt-10">
          <p className="text-xs font-semibold tracking-[0.2em] text-[#8a7855]">
            MORE TO DISCOVER
          </p>

          <h2 className="mt-3 font-serif text-3xl">Explore other stays</h2>

          {otherStays.length > 0 ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {otherStays.map((item) => (
                <Link
                  key={item.slug}
                  href={`/stays/${item.slug}`}
                  prefetch={true}
                  className="group overflow-hidden rounded-2xl border border-[#e4dfd2] bg-white transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="h-52 overflow-hidden">
                    <img
                      src={item.coverImage}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>

                  <div className="p-5">
                    <p className="text-xs text-[#8a7855]">{item.location}</p>

                    <h3 className="mt-2 font-serif text-xl">{item.name}</h3>

                    <p className="mt-3 text-sm">
                      <span className="font-semibold">
                        ₹{item.pricePerNight.toLocaleString("en-IN")}
                      </span>
                      <span className="text-[#77796c]"> / night</span>
                    </p>

                    <p className="mt-4 text-sm font-medium">Explore stay →</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-[#77796c]">
              No other active homestays are available right now.
            </p>
          )}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e4dfd2] bg-[#fbfaf6]/95 p-3 shadow-[0_-8px_24px_rgba(35,55,39,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">
              ₹{stay.pricePerNight.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-[#77796c]">per night</p>
          </div>

          <Link
            href={bookingUrl}
            className="rounded-xl bg-[#294532] px-5 py-3 font-semibold text-white"
          >
            Check Availability
          </Link>
        </div>
      </div>
    </main>
  );
}
