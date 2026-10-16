"use client";

import { useCallback, useEffect, useState } from "react";

type Props = {
  photos: string[];
  stayName: string;
};

type PhotoFallbackProps = {
  large?: boolean;
};

// Declared outside PhotoGallery so React preserves component identity.
function PhotoFallback({ large = false }: PhotoFallbackProps) {
  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-[#e9e8df] p-4 text-center text-[#526252] ${
        large ? "min-h-[220px]" : ""
      }`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className="h-8 w-8"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="8.5" cy="9" r="1.5" />
        <path d="m21 15-5-5L5 20" />
      </svg>
      <span className="text-sm">Photo unavailable</span>
    </div>
  );
}

export default function PhotoGallery({ photos, stayName }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [failedPhotos, setFailedPhotos] = useState<string[]>([]);

  const visiblePhotos = photos.slice(0, 5);
  const hasMorePhotos = photos.length > 5;

  const closeGallery = useCallback(() => {
    setSelected(null);
  }, []);

  const showPrevious = useCallback(() => {
    setSelected((current) =>
      current === null || photos.length === 0
        ? null
        : (current - 1 + photos.length) % photos.length,
    );
  }, [photos.length]);

  const showNext = useCallback(() => {
    setSelected((current) =>
      current === null || photos.length === 0
        ? null
        : (current + 1) % photos.length,
    );
  }, [photos.length]);

  const markPhotoAsFailed = useCallback((photo: string) => {
    setFailedPhotos((current) =>
      current.includes(photo) ? current : [...current, photo],
    );
  }, []);

  useEffect(() => {
    if (selected === null) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeGallery();
      if (event.key === "ArrowLeft") showPrevious();
      if (event.key === "ArrowRight") showNext();
    }

    const previousOverflow = document.body.style.overflow;

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selected, closeGallery, showPrevious, showNext]);

  function openGallery(index: number) {
    setSelected(index);
  }

  return (
    <>
      {photos.length > 0 ? (
        <>
          <section
            aria-label={`${stayName} photo gallery`}
            className="grid grid-cols-2 gap-2 overflow-hidden rounded-2xl sm:grid-cols-4 sm:gap-3"
          >
            {visiblePhotos.map((photo, index) => (
              <button
                key={`${photo}-${index}`}
                type="button"
                onClick={() => openGallery(index)}
                aria-label={`View photo ${index + 1} of ${photos.length} for ${stayName}`}
                className={`group relative overflow-hidden rounded-lg bg-[#e9e8df] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#294532] focus-visible:ring-offset-2 ${
                  index === 0
                    ? "col-span-2 row-span-2 h-[240px] sm:h-[440px]"
                    : `h-[115px] sm:h-[213px] ${
                        index >= 3 ? "hidden sm:block" : ""
                      }`
                }`}
              >
                {failedPhotos.includes(photo) ? (
                  <PhotoFallback large={index === 0} />
                ) : (
                  <img
                    src={photo}
                    alt={`${stayName} - ${getPhotoDescription(photo)}`}
                    loading={index === 0 ? "eager" : "lazy"}
                    onError={() => markPhotoAsFailed(photo)}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                )}

                {index === 4 && hasMorePhotos && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/55 px-2 text-center text-sm font-semibold text-white transition group-hover:bg-black/65 sm:text-base">
                    +{photos.length - 5} more photos
                  </span>
                )}

                {index === 0 && (
                  <span className="absolute bottom-3 left-3 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white sm:text-sm">
                    View photos
                  </span>
                )}
              </button>
            ))}
          </section>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#667064]">
              {photos.length} {photos.length === 1 ? "photo" : "photos"} of{" "}
              {stayName}
            </p>

            <button
              type="button"
              onClick={() => openGallery(0)}
              className="inline-flex items-center gap-2 rounded-full border border-[#294532]/25 px-4 py-2.5 text-sm font-semibold text-[#294532] transition hover:bg-[#294532] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#294532] focus-visible:ring-offset-2"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              View all photos
            </button>
          </div>
        </>
      ) : (
        <div className="flex min-h-[220px] items-center justify-center rounded-2xl bg-[#e9e8df] p-6 text-center text-[#526252]">
          No photos are available for this homestay yet.
        </div>
      )}

      {selected !== null && photos[selected] && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`${stayName} photo viewer`}
          onClick={closeGallery}
        >
          <button
            type="button"
            onClick={closeGallery}
            aria-label="Close photo viewer"
            className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-3xl leading-none text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-5 sm:top-5"
          >
            ×
          </button>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  showPrevious();
                }}
                aria-label="Previous photo"
                className="absolute left-2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-3xl leading-none text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-5 sm:h-12 sm:w-12"
              >
                ‹
              </button>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  showNext();
                }}
                aria-label="Next photo"
                className="absolute right-2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-3xl leading-none text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-5 sm:h-12 sm:w-12"
              >
                ›
              </button>
            </>
          )}

          <div
            className="flex max-h-[88vh] w-full max-w-6xl flex-col items-center gap-3"
            onClick={(event) => event.stopPropagation()}
          >
            {failedPhotos.includes(photos[selected]) ? (
              <div className="h-[50vh] w-full max-w-4xl overflow-hidden rounded-lg">
                <PhotoFallback large />
              </div>
            ) : (
              <img
                src={photos[selected]}
                alt={`${stayName} - ${getPhotoDescription(photos[selected])}`}
                onError={() => markPhotoAsFailed(photos[selected])}
                className="max-h-[75vh] max-w-full rounded-lg object-contain"
              />
            )}

            <p aria-live="polite" className="text-center text-sm text-white/85">
              {stayName} · Photo {selected + 1} of {photos.length}
            </p>

            {photos.length > 1 && (
              <div className="flex max-w-full gap-2 overflow-x-auto px-1 pb-1">
                {photos.map((photo, index) => (
                  <button
                    key={`${photo}-thumbnail-${index}`}
                    type="button"
                    onClick={() => setSelected(index)}
                    aria-label={`Show photo ${index + 1}`}
                    aria-current={selected === index ? "true" : undefined}
                    className={`h-14 w-16 shrink-0 overflow-hidden rounded-md border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                      selected === index
                        ? "border-white opacity-100"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    {failedPhotos.includes(photo) ? (
                      <div className="h-full w-full bg-[#e9e8df]" />
                    ) : (
                      <img
                        src={photo}
                        alt=""
                        loading="lazy"
                        onError={() => markPhotoAsFailed(photo)}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function getPhotoDescription(photo: string): string {
  const filename = photo.split("/").pop()?.split(".")[0] ?? "property";

  const descriptions: Record<string, string> = {
    cover: "homestay exterior and property",
    room: "bedroom",
    interior: "interior living space",
    view: "surrounding nature and views",
    bathroom: "bathroom",
  };

  return descriptions[filename.toLowerCase()] ?? "property photo";
}
