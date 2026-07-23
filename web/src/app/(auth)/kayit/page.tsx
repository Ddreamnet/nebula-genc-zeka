import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Kayıt Ol",
  description: "Nebula Genç Zeka'ya ücretsiz kayıt ol, yapay zekayı keşfet.",
};

export default function KayitPage() {
  return <AuthForm mode="signup" />;
}
