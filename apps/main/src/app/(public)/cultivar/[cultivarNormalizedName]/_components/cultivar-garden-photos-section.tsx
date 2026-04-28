import Link from "next/link";
import { OptimizedImage } from "@/components/optimized-image";
import { H2, Muted } from "@/components/typography";
import { type RouterOutputs } from "@/trpc/react";

type CultivarPageOutput = NonNullable<RouterOutputs["public"]["getCultivarPage"]>;
type GardenPhoto = CultivarPageOutput["gardenPhotos"][number];

interface CultivarGardenPhotosSectionProps {
  photos: GardenPhoto[];
}

export function CultivarGardenPhotosSection({
  photos,
}: CultivarGardenPhotosSectionProps) {
  if (photos.length === 0) {
    return null;
  }

  return (
    <section id="photos" aria-label="Photos" className="space-y-4">
      <H2>Photos in Catalogs</H2>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo) => {
          const href = `/${photo.sellerSlug}?viewing=${photo.listingId}`;

          return (
            <Link
              key={photo.id}
              href={href}
              className="group space-y-2"
              aria-label={`View ${photo.listingTitle} from ${photo.sellerTitle}`}
            >
              <div className="aspect-square overflow-hidden rounded-lg border">
                <OptimizedImage
                  src={photo.url}
                  alt={`${photo.listingTitle} from ${photo.sellerTitle}`}
                  size="full"
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                />
              </div>

              <Muted className="line-clamp-1 text-xs">{photo.sellerTitle}</Muted>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
