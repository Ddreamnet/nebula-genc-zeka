/**
 * Dikey şeridin uzay dekoru — ana sayfadaki hero'nun kelime dağarcığı:
 * yıldız kırıntıları, dört kollu parıltılar, gezegenler.
 *
 * Üç karar burada taşıyıcı:
 *
 * 1. `preserveAspectRatio="xMidYMid slice"` — `none` verilirse gezegenler
 *    şeridin oranıyla birlikte elipse dönüşür. Slice kırpar, esnetmez.
 *
 * 2. Dekor bilinçli olarak ikon bandının DIŞINDA. İkonlar artık şeridin
 *    üstünden başlıyor (bar + açıklık = 71px) ve admin'de yediye kadar
 *    çıkıyor (~y 70–420); bu yüzden gezegenler alt yarıda, y 450'nin
 *    altında. Üstte yalnızca yıldız kırıntısı var. İkonların okunurluğu
 *    dekordan önce gelir.
 *
 * 3. Her gezegen ŞERİDİN İÇİNDE tamamen durur. Önceki sürümde dördü de
 *    kenardan taşıyordu (cx 2 / 52 / 54 üstüne r 19 / 15 / 13) ve kenarda
 *    yarılanmış bir küre, "buraya sığmamış" der — dekor değil kaza gibi
 *    okunur. Aynı sebeple sayı dörtten ikiye indi ve opaklıklar düştü:
 *    58px'lik bir şeritte dört doygun küre, üstündeki dört nav ikonuyla
 *    yarışıyordu. Dekorun işi zemini yaşatmak, dikkat çekmek değil.
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
          <stop offset="0" stopColor="#5C7FC4" stopOpacity=".34" />
          <stop offset="60%" stopColor="#3A5A9B" stopOpacity=".14" />
          <stop offset="1" stopColor="#1B3564" stopOpacity="0" />
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
        <clipPath id="pnRailPlanet">
          <circle cx="29" cy="610" r="17" />
        </clipPath>
      </defs>

      <ellipse cx="29" cy="540" rx="120" ry="220" fill="url(#pnRailGlow)" />

      <circle cx="14" cy="96" r="1.2" fill="#fff" opacity=".55" />
      <circle cx="44" cy="116" r="1.6" fill="#fff" opacity=".45" />
      <circle cx="22" cy="166" r="1" fill="#fff" opacity=".6" />
      <circle cx="48" cy="212" r="1.3" fill="#fff" opacity=".48" />
      <circle cx="10" cy="246" r="1.1" fill="#fff" opacity=".44" />
      <circle cx="46" cy="470" r="1.4" fill="#fff" opacity=".52" />
      <circle cx="46" cy="520" r="1" fill="#fff" opacity=".58" />
      <circle cx="50" cy="628" r="1.5" fill="#fff" opacity=".46" />
      <circle cx="12" cy="668" r="1.1" fill="#fff" opacity=".52" />
      <circle cx="34" cy="688" r="1.3" fill="#fff" opacity=".44" />

      <path
        transform="translate(29 132) scale(.55)"
        d="M0 -11 L2.6 -2.6 L11 0 L2.6 2.6 L0 11 L-2.6 2.6 L-11 0 L-2.6 -2.6 Z"
        fill="#fff"
        opacity=".6"
      />
      <path
        transform="translate(20 648) scale(.45)"
        d="M0 -11 L2.6 -2.6 L11 0 L2.6 2.6 L0 11 L-2.6 2.6 L-11 0 L-2.6 -2.6 Z"
        fill="#fff"
        opacity=".5"
      />

      {/* İkisi de nav bandının altında; küçük olan önce, halkalı olan en
          altta. cx ± r her ikisinde de 4–54 aralığında, yani 58px'lik
          şeridin içinde. */}
      <circle cx="18" cy="472" r="10" fill="url(#pnRailCyan)" opacity=".68" />

      {/* Halkalı gezegen: halkanın arka yayı gezegenin altında, ön yayı
          üstünde çizilir — halka gerçekten gezegenin ETRAFINDAN geçer. Tek
          bir elipsle çizilseydi önünde duran bir çember olurdu. */}
      <g opacity=".8">
        <ellipse
          cx="29"
          cy="610"
          rx="26"
          ry="7"
          fill="none"
          stroke="#5FD8DE"
          strokeWidth="1.8"
          opacity=".7"
          transform="rotate(-16 29 610)"
        />
        <circle cx="29" cy="610" r="17" fill="url(#pnRailViolet)" />
        <g clipPath="url(#pnRailPlanet)">
          <path d="M13 603 q10 -5 19 -1.5 q7 3 13 -.7 l0 5.7 q-7 3.6 -14.5 .7 q-8.7 -3.6 -17.5 1.4 Z" fill="#4C1D95" opacity=".5" />
        </g>
        <path
          d="M 3 610 A 26 7 0 0 0 55 610"
          fill="none"
          stroke="#5FD8DE"
          strokeWidth="1.8"
          opacity=".7"
          transform="rotate(-16 29 610)"
        />
      </g>
    </svg>
  );
}
