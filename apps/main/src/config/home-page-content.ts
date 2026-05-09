import {
  BadgeCheck,
  BookOpenCheck,
  Camera,
  Database,
  Flower2,
  Image as ImageIcon,
  Info,
  ArrowRight,
  Award,
  MessagesSquare,
  Search,
  Bookmark,
  Library,
  Map,
} from "lucide-react";

export const homePageContent = {
  masthead: {
    issue: "",
    title: "",
    count: "",
    mobile: "",
  },
  hero: {
    badge: {
      icon: Award,
      text: "Catalogs from daylily growers",
    },
    title: "The daylily you want. From the grower who has it.",
    subtitle: "",
    description:
      "Browse grower catalogs with photos, prices, availability, notes, and contact info. Details vary by catalog.",
    backgroundImage: {
      src: "/assets/home-redesign/hero-garden.webp",
      alt: "Daylily garden beds at golden hour",
    },
    note: "",
    primaryLink: {
      href: "/catalogs",
      text: "Browse catalogs",
    },
    secondaryLink: {
      href: "/start-membership",
      text: "Create your catalog",
    },
    features: [
      {
        icon: BookOpenCheck,
        text: "Browse catalogs",
      },
      {
        icon: Camera,
        text: "View grower listing photos",
      },
      {
        icon: Search,
        text: "Create a catalog for your daylilies",
      },
    ],
    cta: {
      title: "",
      buttonText: "Create your catalog",
      subtitle:
        "Add photos, prices, availability, notes, and contact info in one public catalog.",
    },
  },
  features: {
    label: "What the site does",
    count: "",
    title: "Browse catalogs. View listings. Contact growers.",
    description:
      "Buyers can browse catalogs. Growers can create a catalog for their own daylilies.",
    cta: {
      href: "/catalogs",
      text: "Browse catalogs",
    },
    aside: {
      label: "",
      body: "Create a public catalog for your daylilies. Add photos, prices, availability, notes, and contact info.",
      secondaryLabel: "",
      cta: {
        href: "/start-membership",
        text: "Create your catalog",
      },
    },
    cards: [
      {
        image: {
          src: "/assets/home-redesign/listing-workspace.webp",
          alt: "Daylily blooms arranged on a grower's work table",
        },
        title: "Browse listing photos",
        description:
          "Catalog pages show daylily photos and details added by the grower.",
        features: [
          { icon: ImageIcon, text: "Listing photos" },
          { icon: Info, text: "Grower notes" },
          { icon: BadgeCheck, text: "Listing details" },
        ],
      },
      {
        image: {
          src: "/assets/home-redesign/collection-planning.webp",
          alt: "Daylily photo prints and garden materials arranged into groups",
        },
        title: "Check prices and availability",
        description:
          "Use catalogs to see listing prices and availability.",
        features: [
          { icon: ArrowRight, text: "Browse catalogs" },
          { icon: ImageIcon, text: "Review listing photos" },
          { icon: Info, text: "Read listing details" },
        ],
      },
      {
        image: {
          src: "/assets/home-redesign/grower-garden.webp",
          alt: "Daylily garden path with a bench among mature beds",
        },
        title: "Contact the grower",
        description:
          "Catalogs give buyers a direct way to contact the grower.",
        features: [
          { icon: Info, text: "Catalog pages" },
          { icon: ImageIcon, text: "Listing images" },
          { icon: MessagesSquare, text: "Listing details" },
        ],
      },
      {
        image: {
          src: "/assets/home-redesign/cultivar-reference.webp",
          alt: "Daylily blooms beside blank reference cards and a ruler",
        },
        title: "Create your catalog",
        description:
          "Growers can create a catalog for the daylilies they want buyers to browse.",
        features: [
          { icon: Flower2, text: "Add daylily listings" },
          { icon: ImageIcon, text: "Upload photos" },
          { icon: Database, text: "Manage your catalog" },
        ],
      },
    ],
  },
  database: {
    label: "Public catalogs",
    title: "See what growers have listed.",
    description:
      "Browse catalog pages and open individual listings to see photos, prices, availability, notes, and contact info.",
    image: {
      src: "/assets/home-redesign/garden-path-proof.webp",
      alt: "Organized daylily beds along a winding gravel path",
    },
    cta: {
      href: "/catalogs",
      text: "Browse catalogs",
    },
  },
  collectors: {
    label: "",
    title: "A catalog page for your daylilies.",
    pillars: [
      {
        icon: Library,
        title: "Add listings",
        body: "Add the daylilies you want buyers to browse.",
      },
      {
        icon: Map,
        title: "Add details",
        body: "Add photos, prices, availability, notes, and contact info.",
      },
      {
        icon: Bookmark,
        title: "Share a public catalog",
        body: "Publish a catalog page buyers can browse from the public catalog list.",
      },
    ],
  },
  finalCta: {
    label: "",
    title: "Browse catalogs or create your own.",
    description:
      "Open catalogs from growers, or create a catalog for your own daylilies.",
    primaryLink: {
      href: "/catalogs",
      text: "Browse catalogs",
    },
    buttonText: "Create your catalog",
    backgroundImage: {
      src: "/assets/home-redesign/open-garden-path.webp",
      alt: "Morning daylily garden path with labeled blooms",
    },
  },
} as const;
