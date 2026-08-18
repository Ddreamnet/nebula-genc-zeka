import Script from "next/script";

/**
 * Google Analytics 4 + Meta Pixel, both switched on purely by the presence of
 * their env var. With neither set this component renders nothing at all — no
 * script tags, no cookies, no third-party requests — so the site can ship
 * before the accounts exist and light up later without a code change.
 *
 *   NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
 *   NEXT_PUBLIC_META_PIXEL_ID=000000000000000
 *
 * Note both of these set cookies. The moment either is enabled, the cookie
 * section of /gizlilik has to describe them (it already does) — and if you
 * later add a consent banner, gating is a single condition around the two
 * <Script> blocks below, which is why they're isolated here rather than
 * inlined into the root layout.
 */
export function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  if (!gaId && !pixelId) return null;

  return (
    <>
      {gaId && (
        <>
          {/* afterInteractive, not beforeInteractive: measurement must never
              sit in front of the hero rendering. */}
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${gaId}');`}
          </Script>
        </>
      )}

      {pixelId && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}
