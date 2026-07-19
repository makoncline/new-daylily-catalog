import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Daylily Catalog",
  description:
    "How Daylily Catalog collects, uses, shares, retains, and lets users control data.",
};

const updatedAt = "July 19, 2026";

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

export default function PrivacyPage() {
  return (
    <div className="bg-[#f6f8f3] px-4 py-12 lg:px-8 lg:py-16">
      <article className="mx-auto max-w-3xl space-y-10">
        <header className="space-y-4">
          <p className="text-sm font-semibold tracking-[0.08em] text-[#a94e38] uppercase">
            Last updated {updatedAt}
          </p>
          <h1 className="text-4xl font-semibold text-[#142118]">
            Privacy Policy
          </h1>
          <p className="text-lg leading-8 text-[#536357]">
            We keep this simple, but Daylily Catalog does collect some data so
            the site can work. This page explains what we collect, why we use
            it, who helps us process it, how long we keep it, and what control
            you have.
          </p>
        </header>

        <Section title="Data We Collect">
          <p>
            Account data: your sign-in ID, email address, profile image, and
            basic account details from our sign-in provider.
          </p>
          <p>
            Catalog data: grower profile details, public catalog copy, location,
            list names and descriptions, listing names and descriptions, prices,
            private notes, listing status, uploaded photo URLs, image order and
            status, list membership, and linked cultivar details.
          </p>
          <p>
            Buyer inquiry data: buyer email, optional buyer name, message text,
            selected cart items, item quantities, item prices, and the seller
            being contacted.
          </p>
          <p>
            Billing data: Stripe customer IDs, checkout and billing portal
            activity, subscription status, invoice and payment status. Stripe
            handles full card details, not Daylily Catalog.
          </p>
          <p>
            Site health and product usage data: page views, search terms and
            filters, button clicks, upload events, request metadata, browser or
            device information, error reports, performance information, and
            rate-limit data. Rate-limit data can include hashed IP-derived and
            email-derived keys.
          </p>
          <p>
            Browser file tools can read and store files and work-in-progress
            data on your device. When a tool needs information from Daylily
            Catalog, it sends only the values needed for that request, such as
            names or saved identifiers used for matching. We do not send file
            contents through product analytics.
          </p>
        </Section>

        <Section title="ChatGPT App">
          <p>
            The Daylily Catalog ChatGPT app is read-only. It does not create,
            update, delete, publish, send messages, upload files, or change
            catalog records through ChatGPT.
          </p>
          <p>
            Public ChatGPT tools may receive search text and filters such as
            cultivar name, hybridizer, color, parentage, seller slug, listing
            ID, listing slug, list ID, price filters, photo filters, cursor, and
            limit. They return public catalog, listing, image, list, seller,
            price, count, cultivar, and Daylily Catalog URL data.
          </p>
          <p>
            Authenticated ChatGPT tools require the user to connect their
            Daylily Catalog account. Those tools may receive IDs, cursor and
            limit values, and catalog filters like title, description, status,
            list ID, price, photo availability, cultivar name, hybridizer, year,
            color, parentage, bloom habit, bloom season, foliage type, form,
            fragrance, ploidy, and broad search text. Broad owner searches can
            search private notes.
          </p>
          <p>
            Authenticated ChatGPT tools may return data from the connected user
            account, including profile title, slug, logo URL, description, rich
            profile content, location, created and updated timestamps, list IDs,
            list titles, list descriptions, list statuses, listing IDs in lists,
            listing titles, listing slugs, listing prices, listing descriptions,
            private notes, listing statuses, cultivar reference IDs, listing
            created and updated timestamps, linked cultivar names and traits,
            image IDs, image URLs, image order, image status, and list
            membership.
          </p>
          <p>
            When a user uses the ChatGPT app, tool inputs and tool outputs are
            sent to OpenAI so ChatGPT can answer. Daylily Catalog does not get
            the full ChatGPT conversation unless ChatGPT sends a tool request to
            our server.
          </p>
        </Section>

        <Section title="How We Use Data">
          <p>
            We use data to sign users in, run dashboards, publish public catalog
            pages, let buyers contact sellers, process memberships and billing,
            send transactional emails, prevent abuse, keep the site secure,
            understand product usage, fix errors, and answer read-only ChatGPT
            app requests.
          </p>
          <p>
            We do not sell personal data. We do not use private catalog data
            from the ChatGPT app to create or modify catalog records.
          </p>
        </Section>

        <Section title="Recipients And Service Providers">
          <p>
            We use service providers to run the site: Clerk for sign-in, Stripe
            for billing, AWS SES for email, PostHog for analytics when enabled,
            Sentry for error reports when enabled, Cloudflare and media storage
            providers for web and image delivery, database and hosting providers
            for app operation, and OpenAI when a user invokes the ChatGPT app.
          </p>
          <p>
            Buyer inquiries are emailed to the selected seller and may also be
            copied to Daylily Catalog admin inboxes for abuse prevention,
            delivery troubleshooting, and support.
          </p>
          <p>
            Public catalog data is intentionally visible to anyone who can view
            the public catalog pages or call public read-only tools.
          </p>
        </Section>

        <Section title="Retention">
          <p>
            We keep account, profile, list, listing, image, and catalog data
            while the account or catalog is active, unless the user edits,
            hides, deletes, or asks us to remove it. Public pages and caches can
            take a short time to update.
          </p>
          <p>
            Billing records are retained for operational, tax, accounting, and
            legal reasons. Buyer inquiry emails are retained by the email
            recipients and email providers. Rate-limit buckets store hashed keys
            and timestamps for abuse prevention. Logs, analytics, and error
            reports are kept only as long as needed for operations, security,
            debugging, and product improvement.
          </p>
          <p>
            Work saved only in your browser remains on that device until the
            tool clears it or you clear the browser&apos;s site data.
          </p>
        </Section>

        <Section title="User Controls">
          <p>
            Growers can edit profile, list, listing, private note, price,
            status, and image data in the dashboard. Growers can hide listings
            or lists from the public catalog by changing their status.
          </p>
          <p>
            Users can manage billing through the Stripe billing portal. Users
            can disconnect or revoke ChatGPT app access from their ChatGPT or
            connected-app settings. Users can contact us for help with access,
            correction, export, deletion, or account closure.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            For privacy requests or questions, contact{" "}
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
