import { LinkButton } from "@/components/layout/link-button";

export default async function NotFound() {
  return (
    <section className="mx-auto grid max-w-2xl justify-items-center gap-5 py-20 text-center">
      <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">
        404
      </p>
      <h1 className="font-serif text-4xl font-semibold lg:text-6xl">
        This page does not exist
      </h1>
      <p className="text-muted-foreground text-lg">
        The daylily or catalog might have moved or is no longer public.
      </p>
      <LinkButton href="/catalogs">Browse the catalogs</LinkButton>
    </section>
  );
}
