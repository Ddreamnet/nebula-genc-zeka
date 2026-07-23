import { Logo } from "@/components/site/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="p-5 sm:p-8">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center px-5 pb-16">
        {children}
      </main>
    </div>
  );
}
