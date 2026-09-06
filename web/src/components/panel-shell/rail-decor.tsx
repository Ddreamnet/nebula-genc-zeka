/**
 * Dikey şeridin uzay dekoru — ana sayfadaki hero'nun kelime dağarcığı:
 * yıldız kırıntıları, dört kollu parıltılar, dört gezegen.
 *
 * İki karar burada taşıyıcı:
 *
 * 1. `preserveAspectRatio="xMidYMid slice"` — `none` verilirse gezegenler
 *    şeridin oranıyla birlikte elipse dönüşür. Slice kırpar, esnetmez.
 *
 * 2. Dekor bilinçli olarak ikon bandının DIŞINDA: y 250–450 aralığı boş
 *    bırakılmıştır. İkonların okunurluğu dekordan önce gelir.
 *
 * Tonal değişim şeridin düz lacivert dolgusunda değil, buradaki `rnGlow`
 * radial gradient'inde yaşar — (29, 470) merkezli, y=60'tan önce sıfıra
 * düşen bir elips. Barın devraldığı yerde dekor bitmiş olur; L'nin
 * birleşimini görünmez tutan şey budur.
 *
 * Statik bir ağaç: hiçbir prop almaz, hiçbir state okumaz. React bunu bir
 * kez oluşturur ve panelin geri kalanı yeniden render olurken dokunmaz.
 */
export function RailDecor() {
  return (
    <svg
      viewBox="0 0 58 702"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 block h-full w-full"
    >
      <defs>
        <radialGradient id="pnRailGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#5C7FC4" stopOpacity=".38" />
          <stop offset="60%" stopColor="#3A5A9B" stopOpacity=".16" />
          <stop offset="1" stopColor="#1B3564" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pnRailAmber" cx="35%" cy="30%" r="78%">
          <stop offset="0" stopColor="#FFE9BC" />
          <stop offset="44%" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#B03A12" />
        </radialGradient>
        <radialGradient id="pnRailCyan" cx="35%" cy="30%" r="78%">
          <stop offset="0" stopColor="#DBFAFC" />
          <stop offset="46%" stopColor="#22D3EE" />
          <stop offset="1" stopColor="#0B5F73" />
        </radialGradient>
        <radialGradient id="pnRailViolet" cx="35%" cy="30%" r="78%">
          <stop offset="0" stopColor="#D9BEFF" />
          <stop offset="46%" stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#4C1D95" />
        </radialGradient>
        <radialGradient id="pnRailMagenta" cx="35%" cy="30%" r="78%">
          <stop offset="0" stopColor="#FFC2DE" />
          <stop offset="46%" stopColor="#EC4899" />
          <stop offset="1" stopColor="#8E1747" />
        </radialGradient>
        <clipPath id="pnRailPlanet">
          <circle cx="30" cy="566" r="24" />
        </clipPath>
      </defs>

      <ellipse cx="29" cy="470" rx="120" ry="230" fill="url(#pnRailGlow)" />

      <circle cx="14" cy="96" r="1.2" fill="#fff" opacity=".62" />
      <circle cx="44" cy="116" r="1.6" fill="#fff" opacity=".5" />
      <circle cx="22" cy="166" r="1" fill="#fff" opacity=".7" />
      <circle cx="48" cy="212" r="1.3" fill="#fff" opacity=".55" />
      <circle cx="10" cy="246" r="1.1" fill="#fff" opacity=".5" />
      <circle cx="46" cy="470" r="1.4" fill="#fff" opacity=".6" />
      <circle cx="16" cy="506" r="1" fill="#fff" opacity=".66" />
      <circle cx="50" cy="612" r="1.5" fill="#fff" opacity=".52" />
      <circle cx="12" cy="660" r="1.1" fill="#fff" opacity=".6" />
      <circle cx="34" cy="684" r="1.3" fill="#fff" opacity=".5" />

      <path
        transform="translate(30 132) scale(.62)"
        d="M0 -11 L2.6 -2.6 L11 0 L2.6 2.6 L0 11 L-2.6 2.6 L-11 0 L-2.6 -2.6 Z"
        fill="#fff"
        opacity=".72"
      />
      <path
        transform="translate(20 636) scale(.5)"
        d="M0 -11 L2.6 -2.6 L11 0 L2.6 2.6 L0 11 L-2.6 2.6 L-11 0 L-2.6 -2.6 Z"
        fill="#fff"
        opacity=".6"
      />

      <circle cx="52" cy="146" r="15" fill="url(#pnRailAmber)" opacity=".92" />
      <circle cx="2" cy="200" r="19" fill="url(#pnRailCyan)" opacity=".9" />

      {/* Halkalı gezegen: halkanın arka yayı gezegenin altında, ön yayı
          üstünde çizilir — halka gerçekten gezegenin ETRAFINDAN geçer. Tek
          bir elipsle çizilseydi önünde duran bir çember olurdu. */}
      <ellipse
        cx="30"
        cy="566"
        rx="37"
        ry="10"
        fill="none"
        stroke="#5FD8DE"
        strokeWidth="2.4"
        opacity=".82"
        transform="rotate(-16 30 566)"
      />
      <circle cx="30" cy="566" r="24" fill="url(#pnRailViolet)" />
      <g clipPath="url(#pnRailPlanet)">
        <path d="M8 556 q14 -7 26 -2 q10 4 18 -1 l0 8 q-10 5 -20 1 q-12 -5 -24 2 Z" fill="#4C1D95" opacity=".55" />
      </g>
      <path
        d="M -7 566 A 37 10 0 0 0 67 566"
        fill="none"
        stroke="#5FD8DE"
        strokeWidth="2.4"
        opacity=".82"
        transform="rotate(-16 30 566)"
      />

      <circle cx="54" cy="656" r="13" fill="url(#pnRailMagenta)" opacity=".9" />
    </svg>
  );
}
