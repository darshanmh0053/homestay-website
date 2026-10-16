import { createClient as createSupabaseServerClient } from "./supabase-server";

export async function getAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!adminEmail) {
    throw new Error("ADMIN_EMAIL is not configured.");
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (
    error ||
    !user ||
    !user.email ||
    !user.email_confirmed_at ||
    user.email.toLowerCase() !== adminEmail
  ) {
    return null;
  }

  return { user, supabase };
}
