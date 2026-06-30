import { PublicFooter } from "@/components/public-footer";
import { PublicNav } from "@/components/public-nav";
import { AuthProviders } from "@/components/auth-providers";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProviders>
      <div className="flex min-h-svh flex-col">
        <header className="flex h-16 items-center border-b px-4">
          <PublicNav />
        </header>
        <main className="bg-muted/20 flex-1">{children}</main>
        <PublicFooter />
      </div>
    </AuthProviders>
  );
}
