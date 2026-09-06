import { siteConfig, whatsappHref } from "@/lib/site";

/**
 * SEO plumbing — canonical URLs and the JSON-LD blocks Google reads.
 *
 * Why this file exists: Next merges metadata from the root layout downwards,
 * and anything a page does NOT set is inherited from its parent. The root
 * layout used to declare `alternates.canonical: SITE_URL`, so every single
 * page in the app shipped `<link rel="canonical" href="https://nebulagenczeka.com">`
 * — /eserler, /blog, every post, both legal pages. That tells Google those
 * URLs are duplicates of the homepage and it should index the homepage
 * instead, which is why nothing but the homepage could ever rank. The root
 * layout no longer sets canonical at all; every public page sets its own via
 * `canonical()` below, and a page that forgets simply ships none (harmless)
 * rather than a wrong one (fatal).
 */

/** `alternates` block for a page. Pass the path, not the full URL. */
export function canonical(path: string) {
  return { canonical: path.startsWith("/") ? path : `/${path}` };
}

export function absoluteUrl(path: string) {
  return new URL(path.startsWith("/") ? path : `/${path}`, siteConfig.url).toString();
}

/**
 * Open Graph block for a page.
 *
 * Next does NOT deep-merge `openGraph`: the moment a page declares one, the
 * parent's is dropped whole — url, siteName, locale, type AND images. The six
 * /eserler pages and every cover-less blog post were setting a title and a
 * description and thereby deleting the site card, so pasting one of those
 * links into WhatsApp showed a bare grey URL. Everything a card needs is
 * rebuilt here, with the site lockup as the image of last resort.
 */
export function openGraphFor(opts: {
  title: string;
  description?: string;
  path: string;
  images?: (string | undefined | null)[];
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
}) {
  const images = (opts.images ?? []).filter((src): src is string => Boolean(src));
  return {
    type: opts.type ?? ("website" as const),
    locale: "tr_TR",
    siteName: siteConfig.name,
    url: absoluteUrl(opts.path),
    title: opts.title,
    description: opts.description,
    images: images.length
      ? images.map((url) => ({ url }))
      : [{ url: "/brand/og-card.jpg", width: 1200, height: 630, alt: siteConfig.name }],
    ...(opts.publishedTime ? { publishedTime: opts.publishedTime } : {}),
    ...(opts.modifiedTime ? { modifiedTime: opts.modifiedTime } : {}),
    ...(opts.authors ? { authors: opts.authors } : {}),
  };
}

/* ------------------------------------------------------------------ *
 * JSON-LD
 * ------------------------------------------------------------------ */

const ORG_ID = `${siteConfig.url}/#organization`;
const SITE_ID = `${siteConfig.url}/#website`;

/**
 * The entity Google attaches the knowledge panel, the sitelinks and the
 * "kimdir/nedir" answers to. EducationalOrganization rather than plain
 * Organization because that is literally what this is, and it makes the
 * Course node below inherit a credible provider.
 */
export const organizationLd = {
  "@context": "https://schema.org",
  "@type": ["EducationalOrganization", "Organization"],
  "@id": ORG_ID,
  name: siteConfig.name,
  alternateName: ["Nebula", "Nebula Genç Zeka Akademi"],
  url: siteConfig.url,
  logo: {
    "@type": "ImageObject",
    url: absoluteUrl("/brand/nebula-lockup.png"),
    width: 2048,
    height: 1024,
  },
  image: absoluteUrl("/brand/og-card.jpg"),
  description:
    "10–18 yaş çocuklar ve gençler için birebir, canlı yapay zeka kursu. Her derste öğrenci gerçek bir iş üretiyor: web sitesi, oyun, görsel, şarkı, kısa film.",
  email: siteConfig.email,
  telephone: `+${siteConfig.whatsapp.number}`,
  founder: { "@type": "Person", name: siteConfig.founder },
  sameAs: [siteConfig.instagram, whatsappHref()],
  areaServed: { "@type": "Country", name: "Türkiye" },
  address: { "@type": "PostalAddress", addressCountry: "TR" },
  knowsLanguage: ["tr-TR"],
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      telephone: `+${siteConfig.whatsapp.number}`,
      email: siteConfig.email,
      availableLanguage: ["Turkish"],
      areaServed: "TR",
    },
  ],
};

export const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": SITE_ID,
  url: siteConfig.url,
  name: siteConfig.name,
  inLanguage: "tr-TR",
  publisher: { "@id": ORG_ID },
};

/**
 * The program itself. Every field here is something the page actually says
 * out loud — Google's structured-data policy requires that, and price is
 * deliberately absent because the site does not publish it (see
 * siteConfig.pricing).
 */
export const courseLd = {
  "@context": "https://schema.org",
  "@type": "Course",
  "@id": `${siteConfig.url}/#course`,
  name: "Çocuklar ve Gençler için Yapay Zeka Kursu",
  description:
    "10–18 yaş için birebir ve canlı yapay zeka eğitimi. Gelişmiş prompting, görsel ve video üretimi, oyun ve web sitesi yapımı; her ders bitmiş bir ürünle bitiyor.",
  url: siteConfig.url,
  provider: { "@id": ORG_ID },
  inLanguage: "tr",
  isAccessibleForFree: false,
  educationalLevel: "Ortaokul ve lise (10–18 yaş)",
  teaches: [
    "Yapay zeka ile prompting",
    "Yapay zeka ile görsel üretimi",
    "Yapay zeka ile video ve kısa film üretimi",
    "Yapay zeka ile web sitesi yapımı",
    "Yapay zeka ile oyun tasarımı",
    "Yapay zeka ile müzik üretimi",
  ],
  audience: {
    "@type": "EducationalAudience",
    educationalRole: "student",
    audienceType: "10–18 yaş öğrenciler ve velileri",
  },
  hasCourseInstance: [
    {
      "@type": "CourseInstance",
      courseMode: "online",
      // Haftada iki ders, 40'ar dakika — sitedeki "haftada 80 dakika" ifadesi.
      courseWorkload: "PT80M",
      courseSchedule: {
        "@type": "Schedule",
        repeatFrequency: "P1W",
        repeatCount: 2,
        duration: "PT40M",
      },
      inLanguage: "tr",
      location: { "@type": "VirtualLocation", url: siteConfig.url },
    },
  ],
};

export function faqLd(items: readonly { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${siteConfig.url}/#faq`,
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

/** Renders as the “Ana sayfa › Eserler › …” trail under the SERP title. */
export function breadcrumbLd(trail: readonly { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function blogPostingLd(post: {
  slug: string;
  title: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": absoluteUrl(`/blog/${post.slug}`),
    mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
    headline: post.title.slice(0, 110),
    description: post.excerpt ?? undefined,
    image: post.coverImageUrl ?? absoluteUrl("/brand/og-card.jpg"),
    datePublished: post.publishedAt ?? undefined,
    dateModified: post.updatedAt ?? post.publishedAt ?? undefined,
    inLanguage: "tr-TR",
    author: { "@type": "Person", name: siteConfig.founder, url: siteConfig.url },
    publisher: { "@id": ORG_ID },
    isPartOf: { "@id": SITE_ID },
  };
}

export function itemListLd(name: string, items: readonly { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}

/**
 * One <script type="application/ld+json"> per call.
 *
 * `<` is escaped because some of this data is user-authored (blog titles and
 * excerpts come out of the admin editor) and an unescaped `</script>` inside
 * the JSON would close the tag and turn the rest into executable markup.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
