export {
  getCultivarRouteSegments,
  getCultivarSitemapEntries,
  getPublicCultivarListingIds,
} from "./public-cultivar-context";
export {
  buildPublicCultivarGardenPhotosFromListingCards,
  buildPublicCultivarOffersFromListingCards,
  buildPublicCultivarPageFromListingCards,
} from "./public-cultivar-sections";

import { loadPublicCultivarContext } from "./public-cultivar-context";
import {
  buildPublicCultivarGardenPhotos,
  buildPublicCultivarOffers,
  buildPublicCultivarPage,
  buildPublicCultivarSummary,
} from "./public-cultivar-sections";

export async function getPublicCultivarPage(cultivarSegment: string) {
  const context = await loadPublicCultivarContext(cultivarSegment);
  if (!context) {
    return null;
  }

  const [summarySection, offersSection, photosSection] = await Promise.all([
    buildPublicCultivarSummary(context),
    buildPublicCultivarOffers(context),
    buildPublicCultivarGardenPhotos(context),
  ]);

  return buildPublicCultivarPage({
    offersSection,
    photosSection,
    summarySection,
  });
}

export async function getPublicCultivarSummary(cultivarSegment: string) {
  const context = await loadPublicCultivarContext(cultivarSegment);
  if (!context) {
    return null;
  }

  return buildPublicCultivarSummary(context);
}
