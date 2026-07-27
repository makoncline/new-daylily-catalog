import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms | Daylily Catalog",
  description: "Simple terms for using Daylily Catalog.",
};

const updatedAt = "July 20, 2026";

function Section({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold text-[#142118]">{title}</h2>
      <div className="space-y-4 text-base leading-7 text-[#536357]">
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="bg-[#f6f8f3] px-4 py-12 lg:px-8 lg:py-16">
      <article className="mx-auto max-w-3xl space-y-10">
        <header className="space-y-4">
          <p className="text-sm font-semibold tracking-[0.08em] text-[#a94e38] uppercase">
            Last updated {updatedAt}
          </p>
          <h1 className="text-4xl font-semibold text-[#142118]">Terms</h1>
          <p className="text-lg leading-8 text-[#536357]">
            Daylily Catalog is a small tool for daylily growers and buyers.
            These are the basic rules for using it.
          </p>
        </header>

        <Section title="Use The Site Respectfully">
          <p>
            Do not use Daylily Catalog to spam people, break the law, attack the
            site, copy private data, impersonate someone else, or post content
            you do not have permission to share.
          </p>
          <p>
            We can remove content, hide catalogs, limit access, or close
            accounts if we need to protect the site or other users.
          </p>
        </Section>

        <Section title="Your Catalog Content">
          <p>
            You are responsible for the catalog profiles, lists, listings,
            prices, notes, photos, and other content you add. Only upload
            content that you own or have permission to use.
          </p>
          <p>
            You still own your photos and catalog content. By uploading them,
            you give Daylily Catalog permission to use them on Daylily Catalog
            without paying you. That includes storing, copying, resizing,
            cropping, creating thumbnails or other image versions, showing them
            in catalogs, search results, listing pages, cultivar pages,
            previews, and Daylily Catalog promotion, and keeping copies in
            backups and caches.
          </p>
          <p>
            This permission continues after upload so the site can keep working.
            If you want something removed, contact us. We will handle reasonable
            requests, but cached pages, backups, emails, and already-created
            materials may not disappear immediately.
          </p>
          <p>
            Choosing a file for a browser-based preparation or preview tool does
            not by itself publish the file or grant Daylily Catalog permission
            to publish its contents. Publishing or importing data requires a
            separate action.
          </p>
        </Section>

        <Section title="File Tools And Automated Results">
          <p>
            When you submit a spreadsheet to a browser-based catalog tool, we
            may log a limited sample of its headers and rows to operate, test,
            troubleshoot, and improve the tool. We do not retain the complete
            workbook through this diagnostic logging.
          </p>
          <p>
            File conversions, automated matches, suggestions, and generated
            output can be incomplete or wrong. Review the results before using
            them for your catalog or business.
          </p>
          <p>
            Browser-based file tools are not general spreadsheet editors. Output
            may preserve cell values without preserving every formula, format,
            macro, comment, validation rule, drawing, merge, or hidden setting
            from the original file.
          </p>
        </Section>

        <Section title="Buyer And Seller Messages">
          <p>
            Daylily Catalog helps buyers contact sellers. Sales, shipping,
            availability, refunds, plant condition, and follow-up conversations
            are between the buyer and seller.
          </p>
          <p>
            We may copy buyer inquiry emails to Daylily Catalog admin inboxes so
            we can troubleshoot delivery, prevent abuse, and support users.
          </p>
        </Section>

        <Section title="Memberships And Billing">
          <p>
            Paid memberships are handled through Stripe. Stripe handles payment
            details. We use subscription status to decide which catalog features
            are available.
          </p>
        </Section>

        <Section title="No Promises Of Perfection">
          <p>
            We try to keep Daylily Catalog useful and reliable, but catalogs,
            cultivar data, search results, images, prices, and availability may
            be incomplete, outdated, or wrong.
          </p>
          <p>
            The site may change, break, or be unavailable sometimes. We are not
            responsible for business losses, missed sales, incorrect plant
            details, or disputes between buyers and sellers.
          </p>
        </Section>

        <Section title="Privacy">
          <p>
            The{" "}
            <Link
              className="font-semibold text-[#173126] underline underline-offset-4"
              href="/privacy"
            >
              Privacy Policy
            </Link>{" "}
            explains what data we collect and how we use it.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions, takedown requests, or account requests can go to{" "}
            <a
              className="font-semibold text-[#173126] underline underline-offset-4"
              href="mailto:admin@daylilycatalog.com"
            >
              admin@daylilycatalog.com
            </a>
            .
          </p>
        </Section>
      </article>
    </div>
  );
}
