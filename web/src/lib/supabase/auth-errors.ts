/** Translates common Supabase auth error messages into the auth form's Turkish copy. */
export function mapSupabaseError(message: string): string {
  const m = message.toLowerCase();

  if (m.includes("invalid login credentials")) {
    return "E-posta veya şifre hatalı.";
  }
  if (m.includes("email not confirmed")) {
    return "E-postanı henüz onaylamadın. Gelen kutunu kontrol et.";
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "Bu e-posta ile zaten bir hesap var.";
  }
  if (m.includes("password should be at least") || m.includes("password is too short")) {
    return "Şifre en az 6 karakter olmalı.";
  }
  if (m.includes("unable to validate email") || m.includes("invalid email")) {
    return "Geçerli bir e-posta adresi gir.";
  }
  if (m.includes("rate limit") || m.includes("too many requests")) {
    return "Çok fazla deneme yapıldı, birazdan tekrar dene.";
  }
  if (m.includes("network")) {
    return "Bağlantı hatası, tekrar dene.";
  }

  return "Bir şeyler ters gitti, tekrar dener misin?";
}
