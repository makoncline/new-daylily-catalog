import { db } from "@/server/db";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";

export async function GET(_request: Request) {
  try {
    console.log("Google Merchant Feed - Starting processing");

    const baseUrl = getBaseUrl();

    // Simplified query - just get all listings with prices
    const where = { price: { not: null } };
    const include = {
      images: {
        take: 4, // Get up to 4 images (1 main + 3 additional)
      },
      ahsListing: true,
      user: {
        include: {
          profile: true,
        },
      },
    };

    // Only log query in non-production environments
    if (process.env.NODE_ENV !== "production") {
      console.log(
        "Google Merchant Feed - Running query:",
        JSON.stringify(where),
      );
    }

    const listings = await db.listing.findMany({
      where,
      include,
    });

    console.log(
      `Google Merchant Feed - Found ${listings.length} listings with prices`,
    );

    if (!listings.length) {
      console.log("No listings found that match criteria");
    }

    // Generate the XML feed
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Daylily Catalog Listings</title>
    <link>${baseUrl}</link>
    <description>Daylily listings available for purchase</description>
`;

    let itemCount = 0;
    const errors: string[] = []; // Collect errors during processing

    // Process listings without excessive logging
    listings.forEach((listing, index) => {
      // Only log every 10th item in production to reduce noise
      const shouldLog =
        process.env.NODE_ENV !== "production" || index % 10 === 0;

      if (shouldLog) {
        console.log(
          `Processing listing ${index}/${listings.length}: ${listing.id}`,
        );
      }

      try {
        const listingName =
          listing.title ?? listing.ahsListing?.name ?? "Unnamed Daylily";

        // Very simple description to avoid XML issues - don't replace & here
        const description = listing.description ?? `${listingName} daylily`;

        const imageUrl = listing.images?.[0]?.url;
        // Get additional images (up to 3 more)
        const additionalImages = listing.images?.slice(1, 4) ?? [];

        const productUrl = `${baseUrl}/${listing.userId}/${listing.id}`;

        // Get catalog/seller name
        const catalogName =
          listing.user.profile?.title ?? `Daylily Catalog #${listing.userId}`;

        // Merchant category for plants - use standard Google taxonomy
        const category = "Home & Garden > Plants > Flowers";

        // Brand is either the hybridizer or store name
        const brand =
          listing.ahsListing?.hybridizer ??
          listing.user.profile?.title ??
          "Daylily Catalog";

        // MPN - use listing ID since we don't have a better alternative
        const mpn = listing.id;

        // Enhanced product title with catalog info
        const enhancedTitle = `${listingName} - ${catalogName}`;

        // Clean all text fields before escaping and using in XML
        const cleanTitle = cleanTextForXml(enhancedTitle);
        const cleanCatalogName = cleanTextForXml(catalogName);
        const cleanDescription = cleanTextForXml(description);

        // Create full description
        const fullDescription = `${cleanDescription} Available from ${cleanCatalogName} on Daylily Catalog.`;

        // Since we filtered for non-null prices in the database query, this is safe
        // Even so, we'll add a fallback for type safety
        const priceFormatted = listing.price?.toFixed(2) ?? "0.00";

        // Build the item XML with all required Google Merchant fields
        const itemXml = `<item>
<title>${escapeXml(cleanTitle)}</title>
<g:title>${escapeXml(cleanTitle)}</g:title>
<link>${escapeXml(productUrl)}</link>
<description>${escapeXml(fullDescription)}</description>
<g:id>${escapeXml(listing.id)}</g:id>
<g:price>${priceFormatted} USD</g:price>
<g:availability>in_stock</g:availability>
<g:google_product_category>Home &amp; Garden &gt; Plants &gt; Flowers</g:google_product_category>
<g:product_type>Daylily</g:product_type>
<g:mpn>${escapeXml(mpn)}</g:mpn>${
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

        console.log(`Adding XML for item ${listing.id}`);
        xml += itemXml;
        if (shouldLog) {
          console.log(`Added item ${listing.id} to feed`);
        }
        itemCount++;
      } catch (error) {
        const errorMessage = `Error processing listing ${listing.id}: ${String(error)}`;
        console.error(errorMessage);
        errors.push(errorMessage);
      }
    });

    console.log(`Added ${itemCount} items to feed`);

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
