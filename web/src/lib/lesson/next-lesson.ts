/**
 * Haftalık şablon slotlarından "sıradaki ders" türetimleri.
 *
 * `student_lessons` haftalık bir şablondur: gün (0=Pazar, JS getDay() ile
 * aynı) + başlangıç/bitiş saati. Panelin sorduğu her soru — sıradaki kim, şu
 * an derste olan var mı, kaç dakika kaldı — bu şablondan ve SAATTEN türetilir.
 * Hiçbiri ayrı bir alanda tutulmaz; tutulsaydı iki kaynak ilk dakikada
 * birbirinden ayrı düşerdi.
 */

export interface SlotRef {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

const MINUTES_PER_WEEK = 7 * 24 * 60;

/** "17:30:00" → 1050. Saniye alanı varsa yok sayılır. */
export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
}

/** Haftanın başından (Pazar 00:00) itibaren dakika. */
function weekMinutes(dayOfWeek: number, time: string): number {
  return dayOfWeek * 24 * 60 + toMinutes(time);
}

/**
 * Bu slotun bir sonraki başlangıcına kaç dakika kaldığı (0 – 10079).
 *
 * Devam eden bir ders 0 döndürmez, bir sonraki haftaya sarar — "sıradaki"
 * sorusunun cevabı değildir. Devam eden ders için `activeSlot` kullanılır.
 */
export function minutesUntilStart(slot: SlotRef, now: Date): number {
  const nowMinutes = weekMinutes(now.getDay(), `${now.getHours()}:${now.getMinutes()}`);
  const slotMinutes = weekMinutes(slot.dayOfWeek, slot.startTime);
  return (slotMinutes - nowMinutes + MINUTES_PER_WEEK) % MINUTES_PER_WEEK;
}

/** Bir öğrencinin slotları arasında en yakın olanı. Slot yoksa null. */
export function nextSlot<T extends SlotRef>(slots: T[], now: Date): { slot: T; minutesUntil: number } | null {
  let best: { slot: T; minutesUntil: number } | null = null;
  for (const slot of slots) {
    const minutes = minutesUntilStart(slot, now);
    if (!best || minutes < best.minutesUntil) best = { slot, minutesUntil: minutes };
  }
  return best;
}

/**
 * Şu anda işlenmekte olan slot — varsa, kalan dakika ve ilerleme oranıyla.
 *
 * Gece yarısını geçen bir ders (bitiş < başlangıç) yok sayılır: şablon
 * arayüzü böyle bir slot kurmaya izin vermiyor, ve varsayılan olarak "geçerli"
 * saymak bütün günü ders sayardı.
 */
export function activeSlot<T extends SlotRef>(
  slots: T[],
  now: Date,
): { slot: T; minutesLeft: number; progress: number } | null {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  for (const slot of slots) {
    if (slot.dayOfWeek !== now.getDay()) continue;
    const start = toMinutes(slot.startTime);
    const end = toMinutes(slot.endTime);
    if (end <= start) continue;
    if (nowMinutes < start || nowMinutes >= end) continue;
    return {
      slot,
      minutesLeft: end - nowMinutes,
      progress: (nowMinutes - start) / (end - start),
    };
  }
  return null;
}

const SHORT_DAYS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

/** Liste satırının sağındaki zaman etiketi: bugünse yalnız saat, değilse gün + saat. */
export function slotLabel(slot: SlotRef, now: Date): string {
  const time = slot.startTime.slice(0, 5);
  return slot.dayOfWeek === now.getDay() && minutesUntilStart(slot, now) < 24 * 60
    ? time
    : `${SHORT_DAYS[slot.dayOfWeek]} ${time}`;
}

/** "SALI, 6 EYLÜL" — barın alt satırı. */
export function longDateLabel(now: Date): string {
  return now
    .toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })
    .toLocaleUpperCase("tr-TR");
}
