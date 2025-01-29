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
      src: "/assets/DALL·E 2025-01-22 16.11.46 - A professional photograph of a stunning daylily garden at golden hour. The garden features various colorful daylilies in full bloom, including vibrant.webp",
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
          src: "/assets/DALL·E 2025-01-22 16.11.11 - Clean minimalist product photography of three different daylily blooms, each showcasing vibrant colors and ruffled petals, arranged against a pure whi.webp",
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
          src: "/assets/DALL·E 2025-01-22 16.10.35 - Visual representation of daylily collection management in a clean modern digital interface. The screen shows cards and lists of daylily varieties, wit.webp",
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
          src: "/assets/DALL·E 2025-01-22 16.10.20 - A professional gardener using a tablet in a beautiful daylily garden. The gardener is standing amidst vibrant flowers, managing a digital inventory on.webp",
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
          src: "/assets/DALL·E 2025-01-22 16.11.00 - An organized grid of daylily photos displayed in a modern digital interface. Each photo features a unique daylily bloom with vibrant colors and detail.webp",
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
      src: "/assets/DALL·E 2025-01-22 16.10.52 - Split screen showing a beautiful daylily bloom on one side and its detailed catalog entry on the other. The catalog entry includes a modern web interf.webp",
      alt: "Daylily database interface",
    },
  },
  finalCta: {
    title: "Ready to grow your garden's presence?",
    description:
      "Join fellow daylily enthusiasts and create your professional online catalog today.",
    buttonText: "Create your catalog",
    backgroundImage: {
      src: "/assets/DALL·E 2025-01-22 16.11.34 - Professional photograph of a stunning daylily garden at golden hour, with various colorful daylilies in bloom, shallow depth of field, soft natural li.webp",
      alt: "Thriving daylily garden at sunset",
    },
  },
} as const;
