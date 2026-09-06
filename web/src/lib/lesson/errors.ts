/**
 * The lesson RPCs answer in English with their internal wording ("Not the next
 * completable lesson"). Every one of these is something a teacher can act on,
 * so each gets a sentence that says what to do instead of what failed.
 *
 * Keyed on substrings taken from the function bodies themselves
 * (rpc_complete_lesson_internal / rpc_undo_complete_lesson_internal), so a
 * message this list has not seen falls through unchanged rather than being
 * swallowed.
 */
export function translateLessonError(raw: string | null | undefined): string {
  const message = raw ?? "";
  if (message.includes("Not the next completable")) return "Dersler sırayla işlenir — önce bundan önceki dersi işaretleyin.";
  if (message.includes("Can only undo the most recent")) return "Yalnızca en son işlenen ders geri alınabilir.";
  if (message.includes("Already completed")) return "Bu ders zaten işlenmiş.";
  if (message.includes("is not completed")) return "Bu ders henüz işlenmemiş.";
  if (message.includes("Instance not found")) return "Ders kaydı bulunamadı — sayfayı yenileyip tekrar deneyin.";
  return message || "İşlem başarısız";
}
