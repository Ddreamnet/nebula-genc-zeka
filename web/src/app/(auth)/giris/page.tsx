import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Giriş Yap",
  description: "Nebula Genç Zeka öğrenci paneline giriş yap.",
};

export default function GirisPage() {
  return <AuthForm />;
}
