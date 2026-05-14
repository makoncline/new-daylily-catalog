export {
  getCultivarRouteSegments,
  getCultivarSitemapEntries,
} from "./public-cultivar-context";
export {
  buildPublicCultivarGardenPhotosFromListingCards,
  buildPublicCultivarOffersFromListingCards,
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
