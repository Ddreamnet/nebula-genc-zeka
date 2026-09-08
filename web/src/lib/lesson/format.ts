export function formatTime(time: string): string {
  try {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return time;
  }
}

/** 0=Pazar, 1=Pazartesi, ..., 6=Cumartesi */
export function getDayName(dayOfWeek?: number): string {
  const days = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  return dayOfWeek !== undefined ? days[dayOfWeek] : "";
}
