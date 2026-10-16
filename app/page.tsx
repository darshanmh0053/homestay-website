"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import StaySearch from "./StaySearch";

import StayResults from "./StayResults";

import TrustSection from "@/components/TrustSection";
import { Suspense } from "react";

const experiences = [
  {
    number: "01",

    title: "Breathe a little deeper",

    description:
      "Trade busy days for green landscapes, fresh air and the quieter rhythm of Malnad.",

    symbol: "✳",
  },

  {
    number: "02",

    title: "Discover coffee country",

    description:
      "Explore the character of Karnataka’s coffee-growing region and its beautiful countryside.",

    symbol: "❋",
  },

  {
    number: "03",

    title: "Make room for moments",

    description:
      "Share a meal, take the scenic route and enjoy time away from the everyday rush.",

    symbol: "♡",
  },
];

const destinations = [
  {
    area: "MUDIGERE · CHIKKAMAGALURU DISTRICT",
    name: "Devaramane Hills",
    slides: [
      {
        type: "Rolling hills · Scenic outing",
        description:
          "Known for its open hill views and misty Western Ghats scenery, Devaramane is a lovely option for travellers exploring the Mudigere side of Malnad.",
        image: "/images/devaramane/1.jpg",
        alt: "Rolling green Devaramane hills in Mudigere",
      },
      {
        type: "Misty landscapes · Nature",
        description:
          "The surrounding hills can look especially atmospheric when mist moves across the slopes. Check local weather and road conditions before you leave.",
        image: "/images/devaramane/2.jpg",
        alt: "Misty hill landscape in the Devaramane area",
      },
      {
        type: "Village scenery · Slow travel",
        description:
          "Take time for the countryside and nearby local sights, and keep the visit flexible because visibility and conditions can change quickly in the hills.",
        image: "/images/devaramane/3.jpg",
        alt: "Green hills near Devaramane in Karnataka",
      },
    ],
  },
  {
    area: "MUDIGERE · SAKLESHPUR REGION",
    name: "Ethina Bhuja (Yethina Bhuja)",
    slides: [
      {
        type: "Mountain scenery · Trekking",
        description:
          "Ethina Bhuja is a distinctive hill in the Mudigere–Sakleshpur region, known for its striking profile and surrounding green slopes.",
        image: "/images/ethina-bhuja/1.jpeg",
        alt: "Yethinna Bhuja hill near Sakleshpur and Mudigere",
      },
      {
        type: "The peak · Wide view",
        description:
          "Seen from farther away, the peak rises distinctly above the surrounding Western Ghats landscape. Plan the trek around fitness, weather and current access guidance.",
        image: "/images/ethina-bhuja/2.jpg",
        alt: "Ettina Bhuja peak viewed from a distance",
      },
      {
        type: "Trekking country · Green slopes",
        description:
          "The approach is part of the experience, with open slopes and hill views along the way. Check local rules and conditions before starting.",
        image: "/images/ethina-bhuja/3.jpg",
        alt: "Ettina Bhuja hill in the Western Ghats",
      },
    ],
  },
  {
    area: "CHIKKAMAGALURU",
    name: "Mullayanagiri Peak",
    slides: [
      {
        type: "Mountain views · Day trip",
        description:
          "Mullayanagiri is the highest peak in Karnataka and a well-known stop for panoramic views across the Western Ghats.",
        image: "/images/mulyangiri/1.jpg",
        alt: "Peaks of Mullayanagiri in the Western Ghats",
      },
      {
        type: "Road trip · Scenic bends",
        description:
          "The drive towards the peak is known for changing mountain perspectives. Start early for a better chance of clear views and check current road conditions.",
        image: "/images/mulyangiri/2.jpg",
        alt: "Curving road on the route to Mullayanagiri",
      },
      {
        type: "Western Ghats · Panoramas",
        description:
          "On a clear day, the surrounding ranges stretch into the distance. Weather can change quickly at elevation, so carry a light layer and check conditions before travelling.",
        image: "/images/mulyangiri/3.jpg",
        alt: "Western Ghats landscape viewed from Mullayanagiri",
      },
    ],
  },
  {
    area: "SAKLESHPUR · HASSAN DISTRICT",
    name: "Manjarabad Fort",
    slides: [
      {
        type: "Heritage · Architecture",
        description:
          "Discover the star-shaped Manjarabad Fort, built under Tipu Sultan in 1792. Its distinctive layout makes it a rewarding heritage stop.",
        image: "/images/manjarabad/1.jpg",
        alt: "Star-shaped Manjarabad Fort near Sakleshpur",
      },
      {
        type: "Fort interiors · Stonework",
        description:
          "Explore the fort's stone corridors and architectural details respectfully, and confirm current access and opening details before visiting.",
        image: "/images/manjarabad/2.jpg",
        alt: "Stone interiors inside Manjarabad Fort",
      },
      {
        type: "Hilltop views · Countryside",
        description:
          "The elevated setting offers views across the surrounding landscape. Keep to permitted visitor areas and check weather and access conditions on the day.",
        image: "/images/manjarabad/3.jpg",
        alt: "Countryside viewed from Manjarabad Fort",
      },
    ],
  },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSlides, setActiveSlides] = useState<Record<string, number>>({});
  const [activeAboutVideo, setActiveAboutVideo] = useState(0);

  const aboutVideos = [
    { src: "/videos/coffee-hills.mp4", title: "Coffe Hills Homestay" },
    {
      src: "/videos/sky-skape.mp4",
      title: "Sky Skape Homestay",
    },
    { src: "/videos/ethina-bhuja.mp4", title: "Ethina Bhuja" },
  ];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlides((current) => {
        const next = { ...current };
        destinations.forEach((destination) => {
          const currentIndex = current[destination.name] ?? 0;
          next[destination.name] =
            (currentIndex + 1) % destination.slides.length;
        });
        return next;
      });
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const showSlide = (
    placeName: string,
    slideCount: number,
    nextIndex: number,
  ) => {
    setActiveSlides((current) => ({
      ...current,
      [placeName]: (nextIndex + slideCount) % slideCount,
    }));
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <main className="min-h-screen overflow-hidden bg-[#fbfaf6] text-[#263b2e]">
      <div className="bg-[#243d2e] px-4 py-2 text-center text-[10px] font-medium tracking-[0.16em] text-[#f7f2e5] sm:text-xs sm:tracking-[0.22em]">
        A LITTLE CLOSER TO NATURE · A LITTLE MORE ROOM TO BREATHE
      </div>

      <header className="sticky top-0 z-50 border-b border-[#e9e4d8] bg-[#fbfaf6]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-4">
          <Link
            href="/"
            onClick={closeMenu}
            className="flex min-w-0 items-center gap-3"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#c9b78c] font-[var(--font-display)] text-xl text-[#49634b] sm:h-12 sm:w-12 sm:text-2xl">
              M
            </span>

            <span className="min-w-0">
              <span className="block whitespace-nowrap font-[var(--font-display)] text-lg font-semibold tracking-wide sm:text-2xl">
                Malnad Nest
              </span>

              <span className="block whitespace-nowrap text-[8px] tracking-[0.16em] text-[#8a7855] sm:text-[10px] sm:tracking-[0.28em]">
                HOMESTAY · KARNATAKA
              </span>
            </span>
          </Link>

          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-6 text-sm lg:flex"
          >
            <a href="#stays" className="transition hover:text-[#9b8050]">
              Our stays
            </a>

            <a href="#experience" className="transition hover:text-[#9b8050]">
              The experience
            </a>

            <a href="#places" className="transition hover:text-[#9b8050]">
              Places to explore
            </a>

            <a href="#about" className="transition hover:text-[#9b8050]">
              Our story
            </a>
          </nav>

          <a
            href="#stays"
            className="hidden shrink-0 rounded-full bg-[#294532] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#3d5b43] sm:inline-flex"
          >
            Find your stay{" "}
            <span className="ml-2" aria-hidden="true">
              ↗
            </span>
          </a>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={
              menuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#d8d1bf] text-[#294532] transition hover:bg-[#f0eee5] lg:hidden"
          >
            {menuOpen ? (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-6 w-6"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="h-6 w-6"
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>

        {menuOpen && (
          <nav
            id="mobile-navigation"
            aria-label="Mobile navigation"
            className="border-t border-[#e9e4d8] bg-[#fbfaf6] px-5 py-3 shadow-lg lg:hidden"
          >
            {[
              ["Our stays", "#stays"],

              ["The experience", "#experience"],

              ["Places to explore", "#places"],

              ["Our story", "#about"],

              ["Contact", "#contact"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                onClick={closeMenu}
                className="block rounded-lg px-4 py-3 text-sm transition hover:bg-[#f0eee5]"
              >
                {label}
              </a>
            ))}

            <a
              href="#stays"
              onClick={closeMenu}
              className="mt-2 block rounded-full bg-[#294532] px-4 py-3 text-center text-sm font-medium text-white"
            >
              Find your stay ↗
            </a>
          </nav>
        )}
      </header>

      <section className="relative isolate overflow-hidden">
        {/* Still image stays visible while the video loads and for reduced-motion users. */}

        <div
          className="absolute inset-0 -z-20 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=2200&q=90')",
          }}
          aria-hidden="true"
        />

        <video
          className="absolute inset-0 -z-10 h-full w-full object-cover motion-reduce:hidden"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=2200&q=90"
          aria-hidden="true"
          tabIndex={-1}
        >
          <source src="/videos/malnad-hero.mp4" type="video/mp4" />
        </video>

        <div
          className="absolute inset-0 -z-0 bg-gradient-to-r from-[#14271c]/85 via-[#14271c]/60 to-[#14271c]/25"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto flex min-h-[560px] max-w-7xl flex-col justify-center px-5 py-20 sm:min-h-[640px] sm:px-8 lg:min-h-[700px]">
          <p className="mb-6 text-[10px] font-semibold tracking-[0.22em] text-[#e4d2a7] sm:text-sm sm:tracking-[0.3em]">
            YOUR SLOWER ESCAPE INTO MALNAD
          </p>

          <h1 className="max-w-3xl font-[var(--font-display)] text-5xl leading-[1.06] text-white sm:text-6xl lg:text-7xl">
            Find your own
            <br />
            <span className="italic text-[#e5d3a8]">little piece</span>
            <br />
            of Malnad.
          </h1>

          <p className="mt-6 max-w-xl text-base leading-7 text-white/90 sm:text-lg sm:leading-8">
            Green hills, coffee country and the quiet beauty of the Western
            Ghats. Make space for slower mornings, meaningful moments and a stay
            that feels like a welcome pause.
          </p>

          <div className="mt-9 flex flex-wrap gap-3 sm:gap-4">
            <a
              href="#stays"
              className="rounded-full bg-[#e7d6ae] px-6 py-3.5 text-sm font-semibold text-[#263b2b] transition hover:bg-white sm:px-7 sm:py-4"
            >
              Explore available stays →
            </a>

            <a
              href="#places"
              className="rounded-full border border-white/70 px-6 py-3.5 text-sm text-white transition hover:bg-white/10 sm:px-7 sm:py-4"
            >
              Discover Malnad
            </a>
          </div>

          <p className="mt-10 text-xs tracking-[0.16em] text-white/75">
            NATURE · LOCAL CHARACTER · TIME WELL SPENT
          </p>
        </div>
      </section>

      <Suspense fallback={<div className="min-h-32" />}>
        <StaySearch />
      </Suspense>

      <section
        id="experience"
        className="mx-auto max-w-7xl scroll-mt-32 px-5 py-10 sm:px-8 sm:py-12 lg:py-16"
      >
        <div className="mx-auto mb-7 max-w-3xl text-center sm:mb-8">
          <p className="mb-2 text-[10px] font-semibold tracking-[0.22em] text-[#8c7953] sm:text-xs">
            THE ART OF SLOW LIVING
          </p>

          <h2 className="font-[var(--font-display)] text-3xl leading-tight sm:text-4xl">
            Not just a place to stay.
            <br />
            <span className="italic text-[#829374]">
              A feeling to take home.
            </span>
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#77796c] sm:text-base sm:leading-7">
            A trip to Malnad can be about more than ticking places off a list.
            It can be about the scenery along the way, the people you travel
            with and the time you finally get to yourself.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {experiences.map((experience) => (
            <article
              key={experience.number}
              className="rounded-2xl border border-[#e8e2d5] bg-white/70 p-5 sm:p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="font-[var(--font-display)] text-2xl text-[#8a9b7d]">
                  {experience.symbol}
                </span>

                <span className="text-xs tracking-[0.18em] text-[#a18d65]">
                  {experience.number}
                </span>
              </div>

              <h3 className="font-[var(--font-display)] text-xl">
                {experience.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#77796c]">
                {experience.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="stays"
        className="scroll-mt-28 bg-[#f0eee5] px-5 py-10 sm:px-8 sm:py-12 lg:py-16"
      >
        <div className="mx-auto max-w-7xl">
          <StayResults />
          <p className="mt-4 text-center text-xs leading-5 text-[#827a69]">
            Availability and final pricing are confirmed by the property. Check
            your selected stay before booking.
          </p>
        </div>
      </section>

      <TrustSection />

      <section
        id="places"
        className="scroll-mt-28 px-5 py-16 sm:px-8 sm:py-20 lg:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="mb-4 text-[10px] font-semibold tracking-[0.28em] text-[#8c7953] sm:text-xs">
              MAKE THE JOURNEY YOURS
            </p>

            <h2 className="font-[var(--font-display)] text-4xl leading-tight sm:text-5xl">
              Explore the beautiful
              <br />
              <span className="italic text-[#829374]">corners of Malnad.</span>
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-[#77796c] sm:text-base">
              From mountain views to forest drives and heritage stops, the wider
              region offers plenty to explore. Travel times depend on your
              starting point and route; confirm directions, access and weather
              locally before leaving.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {destinations.map((destination) => {
              const activeIndex = activeSlides[destination.name] ?? 0;
              const slide = destination.slides[activeIndex];

              return (
                <article
                  key={destination.name}
                  className="group overflow-hidden rounded-2xl border border-[#e8e2d5] bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative h-56 overflow-hidden bg-[#e4e8dd]">
                    {destination.slides.map((item, index) => (
                      <img
                        key={item.image}
                        src={item.image}
                        alt={item.alt}
                        loading="lazy"
                        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                          index === activeIndex ? "opacity-100" : "opacity-0"
                        }`}
                        aria-hidden={index !== activeIndex}
                      />
                    ))}
                    <span className="absolute left-4 top-4 z-10 rounded-full bg-[#fbfaf6]/95 px-3 py-1.5 text-[9px] font-semibold tracking-[0.14em] text-[#435842]">
                      {destination.area}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        showSlide(
                          destination.name,
                          destination.slides.length,
                          activeIndex - 1,
                        )
                      }
                      aria-label={`Previous photo of ${destination.name}`}
                      className="absolute left-3 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-lg text-[#263b2e] shadow hover:bg-white"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        showSlide(
                          destination.name,
                          destination.slides.length,
                          activeIndex + 1,
                        )
                      }
                      aria-label={`Next photo of ${destination.name}`}
                      className="absolute right-3 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-lg text-[#263b2e] shadow hover:bg-white"
                    >
                      ›
                    </button>
                    <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
                      {destination.slides.map((item, index) => (
                        <button
                          key={item.image}
                          type="button"
                          onClick={() =>
                            showSlide(
                              destination.name,
                              destination.slides.length,
                              index,
                            )
                          }
                          aria-label={`Show photo ${index + 1} of ${destination.name}`}
                          aria-current={
                            index === activeIndex ? "true" : undefined
                          }
                          className={`h-2 rounded-full border border-white/90 transition-all ${index === activeIndex ? "w-5 bg-white" : "w-2 bg-white/60"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-xs font-medium tracking-wide text-[#9a8257]">
                      {slide.type}
                    </p>
                    <h3 className="mt-2 font-[var(--font-display)] text-2xl">
                      {destination.name}
                    </h3>
                    <p
                      className="mt-3 min-h-[7rem] text-sm leading-7 text-[#77796c]"
                      aria-live="polite"
                    >
                      {slide.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>

          <p className="mt-6 text-center text-xs leading-6 text-[#827a69]">
            Destination photographs link to their Wikimedia Commons source
            pages. Review each image’s licence and attribution requirements
            before publishing.
          </p>
        </div>
      </section>

      <section
        id="mudigere-guide"
        className="scroll-mt-28 bg-[#e9eee4] px-5 py-16 sm:px-8 sm:py-20 lg:py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="mb-4 text-[10px] font-semibold tracking-[0.28em] text-[#8c7953] sm:text-xs">
              YOUR MALNAD TRAVEL GUIDE
            </p>
            <h2 className="font-[var(--font-display)] text-4xl leading-tight text-[#263b2e] sm:text-5xl">
              Three destinations, one beautiful part of Karnataka.
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#626d5e] sm:text-base">
              Planning a trip to Mudigere, Chikkamagaluru or Sakleshpur? Each
              has its own mix of green hills, coffee-growing landscapes,
              viewpoints and heritage. Use this guide to start planning, then
              check local access and weather before you travel.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            <article className="rounded-2xl border border-[#d8dfd1] bg-[#fbfaf6] p-7 sm:p-8">
              <p className="text-xs font-semibold tracking-[0.18em] text-[#987744]">
                01 · MUDIGERE
              </p>
              <h3 className="mt-4 font-[var(--font-display)] text-3xl text-[#294532]">
                Hills, viewpoints & quiet roads
              </h3>
              <p className="mt-4 text-sm leading-7 text-[#686f62]">
                Mudigere is a useful base for exploring the countryside of
                Chikkamagaluru district. Add Devaramane Hills to a scenic day
                out, or learn about Ethina Bhuja before planning a trek. These
                outings are best planned around daylight, forecast conditions
                and current local guidance.
              </p>
              <p className="mt-4 text-xs leading-6 text-[#77796c]">
                Search ideas: Mudigere places to visit, Devaramane Hills, Ethina
                Bhuja trek, Mudigere homestay.
              </p>
            </article>

            <article className="rounded-2xl border border-[#e6d8c1] bg-[#f8f0e3] p-7 sm:p-8">
              <p className="text-xs font-semibold tracking-[0.18em] text-[#987744]">
                02 · CHIKKAMAGALURU
              </p>
              <h3 className="mt-4 font-[var(--font-display)] text-3xl text-[#294532]">
                Coffee country & mountain views
              </h3>
              <p className="mt-4 text-sm leading-7 text-[#686f62]">
                Chikkamagaluru is known for its coffee-growing region and
                Western Ghats scenery. Mullayanagiri and Baba Budangiri are
                well-known hill destinations; coffee-estate experiences can also
                make room for a slower day between sightseeing stops. Confirm
                trek permits or restrictions wherever required.
              </p>
              <p className="mt-4 text-xs leading-6 text-[#77796c]">
                Search ideas: Chikkamagaluru tourist places, Mullayanagiri, Baba
                Budangiri, coffee estate stay.
              </p>
            </article>

            <article className="rounded-2xl border border-[#d5dfdf] bg-[#edf4f2] p-7 sm:p-8">
              <p className="text-xs font-semibold tracking-[0.18em] text-[#987744]">
                03 · SAKLESHPUR
              </p>
              <h3 className="mt-4 font-[var(--font-display)] text-3xl text-[#294532]">
                Forest scenery & heritage
              </h3>
              <p className="mt-4 text-sm leading-7 text-[#686f62]">
                Sakleshpur is known for green plantation landscapes, trekking
                areas and historic places such as the star-shaped Manjarabad
                Fort. Bisle Ghat viewpoints are another option for travellers
                interested in Western Ghats scenery. Check road conditions and
                local access before setting off.
              </p>
              <p className="mt-4 text-xs leading-6 text-[#77796c]">
                Search ideas: Sakleshpur tourist places, Manjarabad Fort, Bisle
                Ghat viewpoint, Sakleshpur homestay.
              </p>
            </article>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="https://karnatakatourism.org/en/destinations/chikkamagalur/"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[#71836d] px-5 py-3 text-sm text-[#294532] transition hover:bg-white"
            >
              Official Chikkamagaluru guide ↗
            </a>
            <a
              href="https://karnatakatourism.org/en/destinations/sakleshpur/"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[#71836d] px-5 py-3 text-sm text-[#294532] transition hover:bg-white"
            >
              Official Sakleshpur guide ↗
            </a>
            <a
              href="https://karnatakatourism.org/en/attractions/manjarabad-fort"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[#71836d] px-5 py-3 text-sm text-[#294532] transition hover:bg-white"
            >
              Manjarabad Fort details ↗
            </a>
          </div>
        </div>
      </section>

      <section
        id="travel-faq"
        className="scroll-mt-28 px-5 py-10 sm:px-8 sm:py-12 lg:py-14"
      >
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="mb-4 text-[10px] font-semibold tracking-[0.28em] text-[#8c7953] sm:text-xs">
              PLAN WITH CONFIDENCE
            </p>
            <h2 className="font-[var(--font-display)] text-4xl leading-tight text-[#263b2e] sm:text-5xl">
              A few useful things to know.
            </h2>
            <p className="mt-5 text-sm leading-7 text-[#77796c] sm:text-base">
              A little planning helps you enjoy the hills at your own pace.
              These answers cover common questions about a Malnad getaway.
              Confirm property-specific details with us before you book.
            </p>
          </div>

          <div className="space-y-3">
            <details className="group rounded-xl border border-[#e8e2d5] bg-white p-5 open:bg-[#f5f3eb]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-[#294532]">
                What is the best time to visit Malnad?
                <span className="text-xl text-[#9a8257] transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-7 text-[#686f62]">
                Conditions vary by season. October to February often brings more
                comfortable conditions for sightseeing and outdoor plans, while
                the monsoon can bring heavy rain, mist and changing access to
                trails. Check the forecast and local advisories shortly before
                your trip.
              </p>
            </details>

            <details className="group rounded-xl border border-[#e8e2d5] bg-white p-5 open:bg-[#f5f3eb]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-[#294532]">
                What places can I explore around Mudigere?
                <span className="text-xl text-[#9a8257] transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-7 text-[#686f62]">
                Devaramane Hills and Ethina Bhuja are among the names travellers
                research around the Mudigere area. Suitability depends on your
                starting point, transport, fitness and current access. Ask
                locally about route conditions before planning a trek or
                viewpoint visit.
              </p>
            </details>

            <details className="group rounded-xl border border-[#e8e2d5] bg-white p-5 open:bg-[#f5f3eb]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-[#294532]">
                What are popular places to visit in Chikkamagaluru?
                <span className="text-xl text-[#9a8257] transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-7 text-[#686f62]">
                Mullayanagiri, Baba Budangiri and coffee-estate experiences are
                well-known options. Choose stops based on the time available and
                verify any trekking permits, opening information and road
                access.
              </p>
            </details>

            <details className="group rounded-xl border border-[#e8e2d5] bg-white p-5 open:bg-[#f5f3eb]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-[#294532]">
                What can I see in Sakleshpur?
                <span className="text-xl text-[#9a8257] transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-7 text-[#686f62]">
                Sakleshpur is known for plantation landscapes, forest scenery,
                trekking areas and Manjarabad Fort. Check current visitor access
                and conditions before travelling, especially during heavy rain.
              </p>
            </details>

            <details className="group rounded-xl border border-[#e8e2d5] bg-white p-5 open:bg-[#f5f3eb]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-[#294532]">
                How do I choose the right homestay?
                <span className="text-xl text-[#9a8257] transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-7 text-[#686f62]">
                Compare each listing’s location, price, room details and
                included facilities. Check the booking page for current
                availability and contact the property if you need to confirm
                meals, arrival arrangements or suitability for your group.
              </p>
            </details>
          </div>
        </div>
      </section>
      <section
        id="about"
        className="mx-auto grid max-w-7xl scroll-mt-28 gap-7 px-5 py-8 sm:px-8 sm:py-12 lg:grid-cols-2 lg:items-center lg:gap-12 lg:py-16"
      >
        <div className="relative overflow-hidden rounded-2xl bg-[#e4e8dd] shadow-sm">
          <video
            key={aboutVideos[activeAboutVideo].src}
            src={aboutVideos[activeAboutVideo].src}
            autoPlay
            muted
            playsInline
            preload="metadata"
            aria-label={aboutVideos[activeAboutVideo].title}
            onEnded={() =>
              setActiveAboutVideo((index) => (index + 1) % aboutVideos.length)
            }
            className="h-[260px] w-full object-cover sm:h-[360px] lg:h-[430px]"
          />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/65 via-black/20 to-transparent px-4 pb-4 pt-12 text-white sm:px-5 sm:pb-5">
            <p className="text-sm font-medium sm:text-base">
              {aboutVideos[activeAboutVideo].title}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setActiveAboutVideo(
                    (index) =>
                      (index - 1 + aboutVideos.length) % aboutVideos.length,
                  )
                }
                aria-label="Previous video"
                className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-lg text-[#294532] hover:bg-white"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() =>
                  setActiveAboutVideo(
                    (index) => (index + 1) % aboutVideos.length,
                  )
                }
                aria-label="Next video"
                className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-lg text-[#294532] hover:bg-white"
              >
                ›
              </button>
            </div>
          </div>
          <div className="absolute left-4 top-4 flex gap-1.5 sm:left-5 sm:top-5">
            {aboutVideos.map((video, index) => (
              <button
                key={video.src}
                type="button"
                onClick={() => setActiveAboutVideo(index)}
                aria-label={`Play video ${index + 1}`}
                aria-current={index === activeAboutVideo ? "true" : undefined}
                className={`h-1.5 rounded-full transition-all ${index === activeAboutVideo ? "w-7 bg-white" : "w-3 bg-white/65"}`}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-4 text-[10px] font-semibold tracking-[0.25em] text-[#8c7953] sm:text-xs">
            ROOTED IN MALNAD
          </p>

          <h2 className="font-[var(--font-display)] text-4xl leading-tight sm:text-5xl">
            Some places remind you what matters.
          </h2>

          <p className="mt-6 text-sm leading-7 text-[#77796c] sm:text-base">
            We believe a memorable getaway can be made of simple things: a
            slower morning, a beautiful view, time with your favourite people
            and the freedom to explore at your own pace.
          </p>

          <p className="mt-4 text-sm leading-7 text-[#77796c] sm:text-base">
            Malnad Nest welcomes you to discover the character of Karnataka’s
            green Western Ghats region. Explore the available stays and plan a
            visit that fits your kind of break.
          </p>

          <a
            href="#stays"
            className="mt-8 inline-flex rounded-full bg-[#294532] px-7 py-4 text-sm font-medium text-white transition hover:bg-[#3d5b43]"
          >
            Find your stay ↗
          </a>
        </div>
      </section>

      <section
        id="contact"
        className="scroll-mt-24 bg-[#294532] px-4 py-7 text-white sm:px-6 sm:py-9 lg:py-10"
      >
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-7">
          <div className="flex flex-col items-start justify-center py-1 lg:py-3">
            <p className="mb-2 text-[10px] font-semibold tracking-[0.22em] text-[#e5d3a8] sm:text-xs">
              YOUR MALNAD MOMENT AWAITS
            </p>

            <h2 className="max-w-xl font-[var(--font-display)] text-3xl leading-tight sm:text-4xl">
              Ready to trade the rush for a little more green?
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-white/80 sm:text-base sm:leading-7">
              Visit Malnad Nest near Mudigere town. Explore our stays, ask us a
              question, or open the map to plan your route.
            </p>

            <a
              href="#stays"
              className="mt-4 inline-flex rounded-full bg-[#e7d6ae] px-5 py-3 text-sm font-semibold text-[#263b2b] transition hover:bg-white"
            >
              Explore available stays →
            </a>

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="https://wa.me/917483312976?text=Hi%20Malnad%20Nest%21%20I%27d%20like%20to%20enquire%20about%20a%20stay.%20Please%20share%20availability%20and%20pricing."
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/35 px-4 py-2.5 text-sm transition hover:bg-white/10"
              >
                <span aria-hidden="true">◉</span> WhatsApp us
              </a>
              <a
                href="tel:+917483312976"
                className="inline-flex items-center gap-2 rounded-full border border-white/35 px-4 py-2.5 text-sm transition hover:bg-white/10"
              >
                <span aria-hidden="true">☎</span> 7483312976
              </a>
              <a
                href="https://wa.me/917483312976?text=Hi%20Malnad%20Nest%21%20Could%20you%20help%20me%20choose%20the%20right%20homestay%20for%20my%20trip%3F"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-[#e7d6ae]/70 px-4 py-2.5 text-sm text-[#f4e7c7] transition hover:bg-white/10"
              >
                Help me choose ↗
              </a>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/15 bg-[#f8f6ef] text-[#263b2e] shadow-md">
            <div className="h-[190px] sm:h-[220px] lg:h-[230px]">
              <iframe
                title="Map to Cofiya Stay In near Mudigere town"
                src="https://www.google.com/maps?q=13.1225123,75.618558&z=16&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <div className="p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.2em] text-[#92794d]">
                    FIND US IN MUDIGERE
                  </p>
                  <h3 className="mt-2 font-[var(--font-display)] text-2xl">
                    Malnad Nest
                  </h3>
                  <p className="mt-1 text-sm text-[#6e7568]">
                    KM Road, Mudigere, Karnataka
                  </p>
                </div>
                <a
                  href="https://www.google.com/maps/place/Cofiya+Stay+In+-+near+mudigere+town+2+km/@13.1225123,75.618558,17z/data=!3m1!4b1!4m9!3m8!1s0x3ba4d3003983a767:0xf5c1b52310238638!5m2!4m1!1i2!8m2!3d13.1225123!4d75.618558!16s%2Fg%2F11w3g8cn0j?entry=ttu&g_ep=EgoyMDI2MTAxMS4wIKXMDSoASAFQAw%3D%3D"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 rounded-full bg-[#294532] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#3d5b43]"
                >
                  Open Google Maps ↗
                </a>
              </div>

              <div className="mt-3 grid gap-2 border-t border-[#e6e0d3] pt-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-[#85806f]">Contact person</p>
                  <p className="mt-1 text-sm font-semibold">Harish M H</p>
                </div>
                <div>
                  <p className="text-xs text-[#85806f]">Phone / WhatsApp</p>
                  <a
                    href="tel:+917483312976"
                    className="mt-1 inline-block text-sm font-semibold underline decoration-[#b9a77f] underline-offset-4"
                  >
                    +91 74833 12976
                  </a>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-[#85806f]">Instagram</p>
                  <a
                    href="https://www.instagram.com/malnadnests/"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-sm font-semibold underline decoration-[#b9a77f] underline-offset-4"
                  >
                    @malnadnests ↗
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#1b3023] px-5 py-10 text-white/75 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-[var(--font-display)] text-2xl text-white">
              Malnad Nest
            </p>

            <p className="mt-2 text-[10px] tracking-[0.18em]">
              A SLOWER WAY TO STAY.
            </p>
          </div>

          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap gap-x-6 gap-y-3 text-sm"
          >
            <a href="#stays" className="transition hover:text-white">
              Our stays
            </a>

            <a href="#experience" className="transition hover:text-white">
              Experience
            </a>

            <a href="#places" className="transition hover:text-white">
              Places to explore
            </a>

            <a href="#about" className="transition hover:text-white">
              Our story
            </a>

            <a href="#contact" className="transition hover:text-white">
              Contact
            </a>
          </nav>

          <p className="text-xs">© 2026 Malnad Nest Homestay</p>
        </div>
      </footer>
    </main>
  );
}
