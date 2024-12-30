import { EditListingContent } from "../../_components/edit-listing-content";

interface EditListingPageProps {
  params: {
    id: string;
  };
}

export default function EditListingPage({ params }: EditListingPageProps) {
  return <EditListingContent id={params.id} />;
}
