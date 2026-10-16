"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";

type PhotoUploadProps = {
  slug: string;
  photoType: "cover" | "gallery";
  onUploaded: (photo: { path: string; url: string }) => void;
};

type UploadResult = {
  path?: string;
  url?: string;
  error?: string;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function readUploadResponse(response: Response): Promise<UploadResult> {
  try {
    const result: unknown = await response.json();

    if (result && typeof result === "object" && !Array.isArray(result)) {
      return result as UploadResult;
    }

    return {};
  } catch {
    return {};
  }
}

export default function PhotoUpload({
  slug,
  photoType,
  onUploaded,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const uploadingRef = useRef(false);
  const componentId = useId();

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  const [dragging, setDragging] = useState(false);
  const [success, setSuccess] = useState(false);

  const cleanSlug = slug.trim();
  const inputId = `photo-upload-${componentId.replace(/:/g, "")}`;

  function clearTemporaryPreview() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }

  useEffect(() => {
    clearTemporaryPreview();
    setPreview("");
    setError("");
    setSuccess(false);
    setDragging(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }

    return () => {
      clearTemporaryPreview();
    };
    // Reset the upload preview whenever the selected listing or photo type changes.
  }, [cleanSlug, photoType]);

  async function uploadFile(file: File) {
    if (uploadingRef.current) return;

    setError("");
    setSuccess(false);

    if (!cleanSlug) {
      setError("Save the homestay before uploading photos.");
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Please choose a JPEG, PNG, or WebP image.");
      return;
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      setError("Choose an image larger than 0 bytes and no larger than 10 MB.");
      return;
    }

    uploadingRef.current = true;
    setUploading(true);

    clearTemporaryPreview();

    const localPreview = URL.createObjectURL(file);
    previewUrlRef.current = localPreview;
    setPreview(localPreview);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("slug", cleanSlug);
      formData.append("photoType", photoType);

      const response = await fetch("/api/admin/homestay-photos", {
        method: "POST",
        body: formData,
      });

      const result = await readUploadResponse(response);

      if (!response.ok) {
        throw new Error(result.error || "Photo upload failed.");
      }

      if (
        typeof result.url !== "string" ||
        !result.url.trim() ||
        typeof result.path !== "string" ||
        !result.path.trim()
      ) {
        throw new Error(
          "The server did not return a valid uploaded photo URL and path.",
        );
      }

      clearTemporaryPreview();
      setPreview(result.url);
      setSuccess(true);

      onUploaded({
        path: result.path,
        url: result.url,
      });
    } catch (err) {
      clearTemporaryPreview();
      setPreview("");

      setError(
        err instanceof Error ? err.message : "Unable to upload the photo.",
      );
    } finally {
      uploadingRef.current = false;
      setUploading(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      void uploadFile(file);
    }

    event.currentTarget.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);

    if (uploading) return;

    const file = event.dataTransfer.files?.[0];

    if (file) {
      void uploadFile(file);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();

      if (!uploading && cleanSlug) {
        inputRef.current?.click();
      }
    }
  }

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={uploading || !cleanSlug ? -1 : 0}
        aria-label={`Upload ${photoType} photo`}
        aria-disabled={uploading || !cleanSlug}
        onKeyDown={handleKeyDown}
        onDragOver={(event) => {
          event.preventDefault();

          if (!uploading && cleanSlug) {
            setDragging(true);
          }
        }}
        onDragLeave={(event) => {
          if (
            !event.currentTarget.contains(event.relatedTarget as Node | null)
          ) {
            setDragging(false);
          }
        }}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-5 text-center transition ${
          dragging
            ? "border-emerald-700 bg-emerald-50"
            : "border-stone-300 bg-stone-50 hover:border-emerald-600"
        } ${
          uploading || !cleanSlug
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer"
        }`}
        onClick={(event) => {
          if (
            event.target instanceof HTMLElement &&
            event.target.closest("label")
          ) {
            return;
          }

          if (!uploading && cleanSlug) {
            inputRef.current?.click();
          }
        }}
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-6 w-6"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 16V4m0 0L7 9m5-5 5 5M5 15v4a1 1 0 001 1h12a1 1 0 001-1v-4"
            />
          </svg>
        </div>

        <p className="font-semibold text-stone-800">
          {dragging ? "Drop your photo here" : `Upload your ${photoType} photo`}
        </p>

        <p className="mt-1 text-sm text-stone-500">
          Drag and drop an image here, or select it from your device.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          disabled={uploading || !cleanSlug}
          className="sr-only"
          id={inputId}
        />

        <label
          htmlFor={inputId}
          onClick={(event) => event.stopPropagation()}
          className={`mt-4 inline-flex items-center justify-center rounded-lg bg-emerald-800 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-900 ${
            uploading || !cleanSlug
              ? "pointer-events-none opacity-50"
              : "cursor-pointer"
          }`}
        >
          {uploading ? "Uploading..." : "Choose Photo"}
        </label>

        <p className="mt-3 text-xs text-stone-500">
          JPEG, PNG or WebP · Maximum size 10 MB
        </p>
      </div>

      {preview && (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white p-3">
          <p className="mb-2 text-sm font-medium text-stone-700">
            Photo preview
          </p>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt={`${photoType === "cover" ? "Cover" : "Gallery"} photo preview`}
            className="h-48 w-full rounded-lg object-cover sm:h-64"
          />
        </div>
      )}

      {uploading && (
        <div
          role="status"
          className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          Uploading photo to Supabase Storage. Please wait...
        </div>
      )}

      {success && !uploading && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          Photo uploaded successfully. Click Save Changes to save the photo URL
          to the homestay listing.
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {!cleanSlug && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Save the homestay first, then upload its photos.
        </p>
      )}
    </div>
  );
}
