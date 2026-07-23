import type { Metadata } from "next";
import { Playground } from "@/components/playground/playground";

export const metadata: Metadata = {
  title: "Playground",
  description:
    "Nebula Genç Zeka Playground — yapay zekayı hemen dene. Kaydolmadan ücretsiz birkaç deneme hakkı.",
};

export default function PlaygroundPage() {
  return <Playground />;
}
