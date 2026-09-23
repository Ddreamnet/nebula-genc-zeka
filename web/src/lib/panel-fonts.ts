import { Sora } from "next/font/google";

/**
 * Panel başlık yüzü (5a tasarım sistemi). Fredoka'nın yuvarlak ğ'si ve el
 * yazısı tonu saatlerce bakılan bir panelde çocuksu okunuyordu; Sora aynı
 * sıcaklığı Türkçe aksanları net çizerek taşır. Yalnızca panel layout'u
 * yükler — landing ve Atölye bu dosyayı hiç görmez.
 */
export const sora = Sora({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  variable: "--font-sora",
  display: "swap",
});
