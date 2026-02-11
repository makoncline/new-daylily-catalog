import { db } from "@/server/db";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import { formatAhsListingSummary } from "@/lib/utils";
import { getDisplayAhsListing } from "@/lib/utils/ahs-display";

// Constants for merchant feed configuration
const SHIPPING_WEIGHT = "0.5 lb";

export async function GET(_request: Request) {
  try {
    const baseUrl = getBaseUrl();

    // Query all listings with prices
    const where = { price: { not: null } };
    const include = {
      images: {
        take: 4, // Get up to 4 images (1 main + 3 additional)
      },
      cultivarReference: {
        include: {
          ahsListing: true,
        },
      },
      user: {
        include: {
          profile: true,
        },
      },
    };

    const listings = await db.listing.findMany({
      where,
      include,
    });

    // Generate the XML feed
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Daylily Catalog Listings</title>
    <link>${baseUrl}</link>
    <description>Daylily listings available for purchase</description>
`;

    const errors: string[] = []; // Collect errors during processing

    // Process listings
    listings.forEach((listing) => {
      try {
        const displayAhsListing = getDisplayAhsListing(listing);
        const listingName =
          listing.title ?? displayAhsListing?.name ?? "Unnamed Daylily";
        // Combine descriptions
        const userDescription = listing.description;
        const ahsDescription = formatAhsListingSummary(displayAhsListing);
        let combinedDescription = "";
        if (userDescription && ahsDescription) {
          combinedDescription = `${userDescription}\n\n---\n\n${ahsDescription}`;
        } else {
          combinedDescription =
            userDescription ?? ahsDescription ?? `${listingName} daylily`;
        }

        const imageUrl =
          listing.images?.[0]?.url ?? displayAhsListing?.ahsImageUrl;
        const additionalImages = listing.images?.slice(1, 4) ?? [];
        const productUrl = `${baseUrl}/${listing.userId}/${listing.id}`;
        const catalogName =
          listing.user.profile?.title ?? `Daylily Catalog #${listing.userId}`;
        const mpn = listing.id;
        const enhancedTitle = `${listingName} Daylily`;

        // Clean and prepare text
        const cleanTitle = cleanTextForXml(enhancedTitle);
        const cleanCatalogName = cleanTextForXml(catalogName);
        const cleanCombinedDescription = cleanTextForXml(combinedDescription);
        // Append seller info to the end
        const fullDescription = `${cleanCombinedDescription}\n\n Available from ${cleanCatalogName} on Daylily Catalog.`;
        const priceFormatted = listing.price?.toFixed(2) ?? "0.00";

        // Build the item XML with all required Google Merchant fields
        const itemXml = `<item>
<title>${escapeXml(cleanTitle)}</title>
<g:title>${escapeXml(cleanTitle)}</g:title>
<link>${escapeXml(productUrl)}</link>
<description>${escapeXml(fullDescription.substring(0, 5000))}</description>
<g:id>${escapeXml(listing.id)}</g:id>
<g:brand>${escapeXml(cleanCatalogName)}</g:brand>
<g:condition>new</g:condition>
<g:price>${priceFormatted} USD</g:price>
<g:availability>in_stock</g:availability>
<g:google_product_category>Home &amp; Garden &gt; Plants &gt; Flowers</g:google_product_category>
<g:product_type>Daylily</g:product_type>
<g:mpn>${escapeXml(mpn)}</g:mpn>
<g:shipping_weight>${SHIPPING_WEIGHT}</g:shipping_weight>${
          imageUrl
            ? `
<g:image_link>${escapeXml(imageUrl)}</g:image_link>`
            : ""
        }${additionalImages
          .map(
            (img) => `
<g:additional_image_link>${escapeXml(img.url)}</g:additional_image_link>`,
          )
          .join("")}
<g:custom_label_0>${escapeXml(cleanCatalogName)}</g:custom_label_0>
</item>
`;

        xml += itemXml;
      } catch (error) {
        const errorMessage = `Error processing listing ${listing.id}: ${String(error)}`;
        console.error(errorMessage);
        errors.push(errorMessage);
      }
    });

    // If we encountered errors, add a comment in the XML
    if (errors.length > 0) {
      console.error(`Encountered ${errors.length} errors during processing`);
      xml += `<!-- ${errors.length} items failed processing -->\n`;
    }

    // Close the XML
    xml += `  </channel>
</rss>`;

    // Validate the XML before returning
    if (!validateXml(xml)) {
      console.error("Generated XML failed validation. Check logs for details.");

      // Return a simplified, definitely valid XML if the generated one fails validation
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Daylily Catalog Listings</title>
    <link>${baseUrl}</link>
    <description>Daylily listings available for purchase</description>
    <!-- XML validation failed, please check server logs -->
    <!-- ${errors.length} items failed during processing -->
  </channel>
</rss>`,
        {
          headers: {
            "Content-Type": "application/xml",
          },
        },
      );
    }

    // Return the XML feed
    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml",
      },
    });
  } catch (error) {
    console.error("Error generating Google Merchant feed:", error);
    return new Response("Error generating feed", { status: 500 });
  }
}

// Helper function to clean text before XML processing
function cleanTextForXml(text: string | null | undefined): string {
  if (text === null || text === undefined) return "";

  // Convert to string and trim
  let cleaned = String(text).trim();

  // Replace problematic characters - don't replace & since escapeXml handles it
  cleaned = cleaned
    .replace(/×/g, "x") // Replace multiplication symbol
    .replace(/\u00D7/g, "x") // Unicode multiplication symbol
    .replace(/\s{2,}/g, " ") // Replace multiple spaces with single space
    // Remove any control characters and invisible characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFEFF\uFFF0-\uFFFF]/g, "");

  return cleaned;
}

// Helper function to escape XML special characters
function escapeXml(unsafe: string | null | undefined): string {
  if (unsafe === null || unsafe === undefined) return "";

  try {
    const str = String(unsafe).trim();
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  } catch (e) {
    console.error("Error escaping XML:", e);
    return "";
  }
}

// Helper function to validate XML
function validateXml(xml: string): boolean {
  try {
    // Basic validation checks
    if (!xml.includes("<?xml")) {
      console.error("XML validation failed: Missing XML declaration");
      return false;
    }

    if (!xml.includes("<rss")) {
      console.error("XML validation failed: Missing RSS root element");
      return false;
    }

    // Count opening and closing tags for important elements
    const openChannelTags = (xml.match(/<channel>/g) ?? []).length;
    const closeChannelTags = (xml.match(/<\/channel>/g) ?? []).length;
    const openItemTags = (xml.match(/<item>/g) ?? []).length;
    const closeItemTags = (xml.match(/<\/item>/g) ?? []).length;

    if (openChannelTags !== closeChannelTags) {
      console.error(
        `XML validation failed: Unbalanced channel tags (${openChannelTags} opening, ${closeChannelTags} closing)`,
      );
      return false;
    }

    if (openItemTags !== closeItemTags) {
      console.error(
        `XML validation failed: Unbalanced item tags (${openItemTags} opening, ${closeItemTags} closing)`,
      );
      return false;
    }

    // Check for required Google Merchant fields in at least one item
    const requiredFields = [
      "<g:id>",
      "<g:title>",
      "<title>",
      "<g:price>",
      "<g:availability>",
      "<g:google_product_category>",
      "<link>",
      "<description>",
    ];

    for (const field of requiredFields) {
      if (!xml.includes(field)) {
        console.error(`XML validation failed: Missing required field ${field}`);
        return false;
      }
    }

    // Check for proper format of g:price (must include currency)
    if (!xml.includes(" USD</g:price>")) {
      console.error("XML validation failed: Price must include currency (USD)");
      return false;
    }

    return true;
  } catch (e) {
    console.error("Error validating XML:", e);
    return false;
  }
}
