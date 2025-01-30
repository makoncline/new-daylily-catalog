import {
  Flower2,
  ListChecks,
  Image as ImageIcon,
  Info,
  ArrowRight,
  Award,
} from "lucide-react";

export const homePageContent = {
  hero: {
    badge: {
      icon: Award,
      text: "#1 Daylily App",
      stars: 5,
    },
    title: "Your garden deserves a beautiful online home",
    description:
      "Create a stunning catalog for your daylily collection in minutes. Auto-populate listings from our database of 100,000+ registered cultivars, organize your garden, and share your passion with fellow enthusiasts.",
    backgroundImage: {
      src: "/assets/hero-garden.webp",
      alt: "Beautiful daylily garden at golden hour",
    },
    features: [
      { emoji: "📚", text: "Connect with 100,000+ official cultivars" },
      { emoji: "🖼️", text: "Beautiful photo galleries for each listing" },
      { emoji: "🗂️", text: "Organize collections into custom lists" },
      { emoji: "🌱", text: "Share your garden's story" },
    ],
    cta: {
      title: "Get started for free",
      buttonText: "Create your catalog",
      subtitle: "If you already have an account, we'll log you in",
    },
  },
  features: {
    title: "Everything you need",
    description:
      "Powerful tools to help you manage your daylily collection, create a professional catalog, and grow your business.",
    cards: [
      {
        image: {
          src: "/assets/catalog-blooms.webp",
          alt: "Professional daylily catalog interface",
        },
        title: "Professional Catalog",
        description:
          "Create beautiful, detailed listings with official cultivar data and high-quality photos.",
        features: [
          { icon: Flower2, text: "Auto-populate with official data" },
          { icon: ImageIcon, text: "Multiple photos per listing" },
          { icon: Info, text: "Public and private notes" },
        ],
      },
      {
        image: {
          src: "/assets/collection-management.webp",
          alt: "Daylily collection management interface",
        },
        title: "Smart Organization",
        description:
          "Group your daylilies into custom lists for gardens, sales, or seasonal collections.",
        features: [
          { icon: ListChecks, text: "Create custom lists" },
          { icon: ArrowRight, text: "Quick filters and search" },
          { icon: Info, text: "Track inventory easily" },
        ],
      },
      {
        image: {
          src: "/assets/gardener-tablet.webp",
          alt: "Garden profile and bio interface",
        },
        title: "Garden Profile",
        description:
          "Share your story and make it easy for customers to connect with you.",
        features: [
          { icon: ImageIcon, text: "Showcase your garden" },
          { icon: Info, text: "Professional bio" },
          { icon: ArrowRight, text: "Contact information" },
        ],
      },
      {
        image: {
          src: "/assets/cultivar-grid.webp",
          alt: "Daylily database interface",
        },
        title: "Cultivar Database",
        description:
          "Access official data for over 100,000 registered daylilies to ensure accuracy.",
        features: [
          { icon: Flower2, text: "Official cultivar data" },
          { icon: ImageIcon, text: "Registration photos" },
          { icon: Info, text: "Complete specifications" },
        ],
      },
    ],
  },
  database: {
    title: "Access 100,000+ Registered Cultivars",
    description:
      "Save time and ensure accuracy by connecting your listings to our extensive database of registered daylilies. Auto-populate details like hybridizer, registration year, bloom characteristics, and more.",
    image: {
      src: "/assets/database-split.webp",
      alt: "Daylily database interface",
    },
  },
  finalCta: {
    title: "Ready to grow your garden's presence?",
    description:
      "Join fellow daylily enthusiasts and create your professional online catalog today.",
    buttonText: "Create your catalog",
    backgroundImage: {
      src: "/assets/cta-garden.webp",
      alt: "Thriving daylily garden at sunset",
    },
  },
} as const;
