import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAdminUser } from "@/lib/supabase-admin";
import { createServiceClient } from "@/lib/supabase-service";

const BUCKET = "homestay-photos";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function matchesImageSignature(
  bytes: Uint8Array,
  contentType: string,
): boolean {
  if (contentType === "image/jpeg") {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }

  if (contentType === "image/png") {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  if (contentType === "image/webp") {
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }

  return false;
}

export async function POST(request: Request) {
  try {
    // Require an authenticated, email-confirmed admin account.
    const admin = await getAdminUser();

    if (!admin) {
      return errorResponse(
        "Unauthorized. Please sign in with the configured admin account.",
        401,
      );
    }

    let formData: FormData;

    try {
      formData = await request.formData();
    } catch {
      return errorResponse("The upload request is invalid.", 400);
    }

    const file = formData.get("file");
    const slugValue = formData.get("slug");
    const photoTypeValue = formData.get("photoType");

    if (!(file instanceof File)) {
      return errorResponse("Please select an image file.", 400);
    }

    if (typeof slugValue !== "string" || !SLUG_PATTERN.test(slugValue)) {
      return errorResponse("Invalid homestay slug.", 400);
    }

    if (photoTypeValue !== "cover" && photoTypeValue !== "gallery") {
      return errorResponse("Photo type must be cover or gallery.", 400);
    }

    const extension = ALLOWED_TYPES[file.type];

    if (!extension) {
      return errorResponse("Use a JPEG, PNG, or WebP image.", 415);
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return errorResponse(
        "Image must be greater than 0 bytes and no larger than 10 MB.",
        413,
      );
    }

    // Check that the uploaded content matches its declared image type.
    const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());

    if (!matchesImageSignature(header, file.type)) {
      return errorResponse(
        "The file contents do not match a supported image format.",
        415,
      );
    }

    const service = createServiceClient();

    // Only allow uploads for a listing already saved in the database.
    const { data: listing, error: listingError } = await service
      .from("homestay_listings")
      .select("slug")
      .eq("slug", slugValue)
      .maybeSingle();

    if (listingError) {
      console.error(
        "Could not verify homestay before photo upload:",
        listingError.message,
      );

      return errorResponse(
        "Could not verify the homestay. Please try again.",
        500,
      );
    }

    if (!listing) {
      return errorResponse(
        "Create and save the homestay before uploading its photos.",
        404,
      );
    }

    const filename = `${randomUUID()}.${extension}`;

    const filePath =
      photoTypeValue === "cover"
        ? `${slugValue}/cover/${filename}`
        : `${slugValue}/gallery/${filename}`;

    const { error: uploadError } = await service.storage
      .from(BUCKET)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
        cacheControl: "31536000",
      });

    if (uploadError) {
      console.error("Supabase photo upload failed:", uploadError.message);

      return errorResponse(
        "Photo upload failed. Check that the homestay-photos bucket exists and its file-size and MIME-type limits allow this image.",
        500,
      );
    }

    const { data } = service.storage.from(BUCKET).getPublicUrl(filePath);

    if (!data.publicUrl) {
      console.error("Supabase did not return a public photo URL.");

      return errorResponse(
        "The photo uploaded, but its public URL could not be generated.",
        500,
      );
    }

    return NextResponse.json({
      success: true,
      path: filePath,
      url: data.publicUrl,
      photoType: photoTypeValue,
    });
  } catch (error) {
    console.error("Admin photo upload error:", error);

    return errorResponse(
      "Unable to upload the photo. Check your admin session and Supabase configuration.",
      500,
    );
  }
}
