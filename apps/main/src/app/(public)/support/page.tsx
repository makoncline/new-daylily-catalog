import { buildPublicPageMetadata } from "@/app/(public)/_seo/public-seo";
import { getPublicFeedbackUrl } from "@/hooks/use-feedback-url";
import { IMAGES } from "@/lib/constants/images";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";

const PAGE_PATH = "/support";
const PAGE_TITLE = "Support | Daylily Catalog";
const PAGE_DESCRIPTION =
  "Get help with Daylily Catalog accounts, catalogs, imports, privacy requests, bugs, or feature ideas through the feedback form or support email.";
const BASE_URL = getCanonicalBaseUrl();

export const metadata = buildPublicPageMetadata({
  canonicalPath: PAGE_PATH,
  description: PAGE_DESCRIPTION,
  imageAlt: "Daylily Catalog support",
  imageUrl: IMAGES.DEFAULT_META,
  pageUrl: `${BASE_URL}${PAGE_PATH}`,
  title: PAGE_TITLE,
});

export default function SupportPage() {
  const feedbackUrl = getPublicFeedbackUrl();

  return (
    <div className="bg-brand-surface px-4 py-12 lg:px-8 lg:py-16">
      <article className="mx-auto max-w-3xl space-y-10">
        <header className="space-y-4">
          <h1 className="text-brand-ink text-4xl font-semibold">Support</h1>
          <p className="text-brand-copy text-lg leading-8">
            Need help with Daylily Catalog? Send us an email or use the feedback
            form.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-brand-ink text-2xl font-semibold">
            Ideas And Bugs
          </h2>
          <p className="text-brand-copy text-base leading-7">
            Share a feature idea or report something that is not working with
            the{" "}
            <a
              className="text-brand-forest font-semibold underline underline-offset-4"
              href={feedbackUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              feedback form
            </a>
            .
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-brand-ink text-2xl font-semibold">Email</h2>
          <p className="text-brand-copy text-base leading-7">
            For account help, privacy requests, takedown requests, or general
            questions, email{" "}
            <a
              className="text-brand-forest font-semibold underline underline-offset-4"
              href="mailto:admin@daylilycatalog.com"
            >
              admin@daylilycatalog.com
            </a>
            .
          </p>
        </section>
      </article>
    </div>
  );
}
