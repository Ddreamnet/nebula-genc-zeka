import Link from "next/link";
import { Mail } from "lucide-react";
import { Container } from "@/components/ui/container";
import { InstagramIcon } from "@/components/ui/brand-icons";
import { Logo } from "./logo";
import { siteConfig } from "@/lib/site";

const legal = [
  { label: "KVKK", href: "/kvkk" },
  { label: "Gizlilik", href: "/gizlilik" },
  { label: "Mesafeli Satış", href: "/mesafeli-satis" },
  { label: "Çerezler", href: "/cerezler" },
];

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: readonly { label: string; href: string }[];
}) {
  return (
    <div>
      <h4 className="font-mono text-xs uppercase tracking-widest text-on-surface-variant/70">
        {title}
      </h4>
      <ul className="mt-4 space-y-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-sm text-on-surface-variant transition hover:text-secondary-bright"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="mt-10 border-t border-white/5 bg-surface-lowest/60">
      <Container className="py-14">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-on-surface-variant">
              {siteConfig.ageRange} için canlı, uygulamalı yapay zeka akademisi.
              Geleceğin dilini bugün öğretiyoruz.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a
                href={`mailto:${siteConfig.email}`}
                aria-label="E-posta"
                className="inline-flex size-10 items-center justify-center rounded-full border border-white/8 text-on-surface-variant transition hover:border-secondary/40 hover:text-secondary-bright"
              >
                <Mail className="size-5" />
              </a>
              <a
                href={siteConfig.instagram}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="inline-flex size-10 items-center justify-center rounded-full border border-white/8 text-on-surface-variant transition hover:border-secondary/40 hover:text-secondary-bright"
              >
                <InstagramIcon className="size-5" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <FooterCol title="Keşfet" links={siteConfig.nav} />
            <FooterCol title="Yasal" links={legal} />
            <div>
              <h4 className="font-mono text-xs uppercase tracking-widest text-on-surface-variant/70">
                İletişim
              </h4>
              <a
                href={`mailto:${siteConfig.email}`}
                className="mt-4 block text-sm text-on-surface-variant transition hover:text-secondary-bright"
              >
                {siteConfig.email}
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-sm text-on-surface-variant/70 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. Tüm hakları saklıdır.
          </p>
          <p className="font-mono text-xs">Türkiye&apos;de tasarlandı ✦</p>
        </div>
      </Container>
    </footer>
  );
}
