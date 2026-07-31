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
    <div className="bg-[#f6f8f3] px-4 py-12 lg:px-8 lg:py-16">
      <article className="mx-auto max-w-3xl space-y-10">
        <header className="space-y-4">
          <h1 className="text-4xl font-semibold text-[#142118]">Support</h1>
          <p className="text-lg leading-8 text-[#536357]">
            Need help with Daylily Catalog? Send us an email or use the feedback
            form.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#142118]">
            Ideas And Bugs
          </h2>
          <p className="text-base leading-7 text-[#536357]">
            Share a feature idea or report something that is not working with
            the{" "}
            <a
              className="font-semibold text-[#173126] underline underline-offset-4"
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
          <h2 className="text-2xl font-semibold text-[#142118]">Email</h2>
          <p className="text-base leading-7 text-[#536357]">
            For account help, privacy requests, takedown requests, or general
            questions, email{" "}
            <a
              className="font-semibold text-[#173126] underline underline-offset-4"
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
