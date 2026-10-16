import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "../../../lib/supabase-service";
import BookingForm from "./BookingForm";

export const instant = false;

type Stay = {
  slug: string;
  name: string;
  location: string;
  pricePerNight: number;
};

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    checkIn?: string;
    checkOut?: string;
  }>;
};

async function getStay(slug: string): Promise<Stay | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("homestay_listings")
    .select("slug, name, location, price_per_night")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Could not load booking homestay:", error.message);
    throw new Error("Could not load the selected homestay.");
  }

  if (!data) return null;

  const pricePerNight = Number(data.price_per_night);

  return {
    slug: data.slug,
    name: data.name,
    location: data.location,
    pricePerNight: Number.isFinite(pricePerNight) ? pricePerNight : 0,
  };
}

export default async function BookingPage({ params, searchParams }: Props) {
  const [{ slug }, { checkIn, checkOut }] = await Promise.all([
    params,
    searchParams,
  ]);

  const stay = await getStay(slug);

  if (!stay) notFound();

  return (
    <main className="min-h-screen bg-[#f7f5ee] px-4 py-6 text-[#203b2b] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="font-serif text-xl font-bold tracking-tight text-[#244632] sm:text-2xl"
          >
            Malnad Nest
          </Link>

          <Link
            href={`/stays/${stay.slug}`}
            className="rounded-full border border-[#d9dfd2] bg-white/80 px-4 py-2 text-sm font-semibold text-[#31523b] transition hover:border-[#31523b] hover:bg-white"
          >
            ← Property details
          </Link>
        </header>

        <div className="grid items-start gap-6 py-7 sm:py-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
          <section>
            <div className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#9a7847]">
                Your Malnad moment
              </p>

              <h1 className="mt-3 max-w-2xl font-serif text-4xl font-medium leading-[1.08] tracking-tight text-[#203b2b] sm:text-5xl">
                Let&apos;s plan your
                <span className="block italic text-[#718267]">
                  peaceful getaway.
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-7 text-[#626b5f] sm:text-base">
                Share a few details about your visit. We&apos;ll check
                availability and confirm the arrangements with you.
              </p>
            </div>

            <section className="overflow-hidden rounded-3xl border border-[#e3e1d6] bg-white shadow-[0_12px_35px_rgba(32,59,43,0.07)]">
              <div className="bg-[#244632] px-5 py-5 text-white sm:px-7 sm:py-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#e5d5a7]">
                  Your selected stay
                </p>
                <h2 className="mt-2 font-serif text-2xl leading-tight sm:text-3xl">
                  {stay.name}
                </h2>
                <p className="mt-2 flex items-center gap-2 text-sm text-white/75">
                  <span aria-hidden="true">⌖</span>
                  {stay.location}
                </p>
              </div>

              <div className="p-5 sm:p-7">
                <BookingForm
                  staySlug={stay.slug}
                  stayName={stay.name}
                  pricePerNight={stay.pricePerNight}
                  initialCheckIn={checkIn ?? ""}
                  initialCheckOut={checkOut ?? ""}
                />
              </div>
            </section>

            <p className="mt-4 text-xs leading-5 text-[#7a8075]">
              Sending an enquiry does not confirm a reservation. Your stay is
              confirmed only after we reply with availability and final pricing.
            </p>
          </section>

          <aside className="grid gap-4 sm:grid-cols-2 lg:sticky lg:top-6 lg:grid-cols-1">
            <section className="rounded-3xl border border-[#e3e1d6] bg-white p-5 shadow-sm sm:p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9a7847]">
                Stay details
              </p>

              <p className="mt-3 font-serif text-xl leading-snug text-[#203b2b]">
                {stay.name}
              </p>
              <p className="mt-1 text-sm text-[#73796e]">{stay.location}</p>

              <div className="my-5 border-t border-[#e9e7df]" />

              <p className="text-xs font-medium text-[#73796e]">
                Starting price
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-[#244632]">
                ₹{stay.pricePerNight.toLocaleString("en-IN")}
                <span className="ml-1 text-sm font-medium text-[#73796e]">
                  / night
                </span>
              </p>
              <p className="mt-2 text-xs leading-5 text-[#73796e]">
                Final price depends on dates, guest count, and confirmed
                arrangements.
              </p>
            </section>

            <section className="rounded-3xl bg-[#eaf0e5] p-5 sm:p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6c805e]">
                Simple & personal
              </p>
              <h2 className="mt-2 font-serif text-xl text-[#244632]">
                What happens next?
              </h2>

              <ol className="mt-4 space-y-4 text-sm leading-6 text-[#526653]">
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white font-semibold text-[#31523b]">
                    1
                  </span>
                  <span>Share your dates and guest details.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white font-semibold text-[#31523b]">
                    2
                  </span>
                  <span>Send your enquiry to the Malnad Nest team.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white font-semibold text-[#31523b]">
                    3
                  </span>
                  <span>
                    We&apos;ll reply to confirm availability and pricing.
                  </span>
                </li>
              </ol>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
