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
    title: "Show Your Garden's Beauty to the World",
    description:
      "Every bloom tells a story worth sharing. Instantly create beautiful, professional listings, effortlessly organize your garden, and connect deeply with a community that celebrates every bloom.",
    backgroundImage: {
      src: "/assets/hero-garden.webp",
      alt: "Beautiful daylily garden at golden hour",
    },
    features: [
      { emoji: "📚", text: "Trusted cultivar database" },
      { emoji: "🖼️", text: "Beautiful visual galleries" },
      { emoji: "🗂️", text: "Intuitive organization tools" },
      { emoji: "🌱", text: "Community connections" },
    ],
    cta: {
      title: "Start Sharing Your Blooms Today",
      buttonText: "Start Your Catalog",
      subtitle: "Already registered? We'll log you in.",
    },
  },
  features: {
    title: "Cultivate Your Digital Garden",
    description:
      "Turn your collection into a thriving digital showcase with tools designed to manage, highlight, and connect.",
    cards: [
      {
        image: {
          src: "/assets/catalog-blooms.webp",
          alt: "Professional daylily catalog interface",
        },
        title: "Your Blooms, Front and Center",
        description:
          "Give every bloom its spotlight moment. Easily combine trusted cultivar data with your own insights, creating listings that captivate.",
        features: [
          { icon: Flower2, text: "Verified cultivar information" },
          { icon: ImageIcon, text: "Multiple image galleries" },
          { icon: Info, text: "Private and public notes" },
        ],
      },
      {
        image: {
          src: "/assets/collage.png",
          alt: "Daylily collection management interface",
        },
        title: "Gardens with Personality",
        description:
          "Curate and organize your blooms into gardens, seasonal showcases, or specialized lists—designed with gardeners in mind.",
        features: [
          { icon: ListChecks, text: "Customizable collections" },
          { icon: ArrowRight, text: "Fast search and filters" },
          { icon: Info, text: "Easy inventory tracking" },
        ],
      },
      {
        image: {
          src: "/assets/wild.png",
          alt: "Garden profile and bio interface",
        },
        title: "Connect Through Your Garden",
        description:
          "Build your garden’s legacy. Create a profile that shares your gardening journey, inspires others, and grows your network.",
        features: [
          { icon: ImageIcon, text: "Stunning garden galleries" },
          { icon: Info, text: "Professional garden profiles" },
          { icon: ArrowRight, text: "Seamless communication" },
        ],
      },
      {
        image: {
          src: "/assets/bouquet.png",
          alt: "Daylily database interface",
        },
        title: "Instant Expertise",
        description:
          "Instantly access detailed information and beautiful images for over 100,000 cultivars, elevating each of your listings effortlessly.",
        features: [
          { icon: Flower2, text: "Comprehensive cultivar details" },
          { icon: ImageIcon, text: "Official cultivar photos" },
          { icon: Info, text: "Detailed cultivar specs" },
        ],
      },
    ],
  },
  database: {
    title: "Showcase Your Garden",
    description:
      "Give your carefully grown daylilies the attention they deserve. Share your garden alongside fellow gardeners who appreciate every bloom.",
    image: {
      src: "/assets/windingPath.png",
      alt: "Daylily database interface",
    },
  },
  finalCta: {
    title: "Let's Bloom Together",
    description:
      "Join a vibrant community sharing their passion for beautiful gardens. Your perfect digital garden is waiting.",
    buttonText: "Start Your Catalog",
    backgroundImage: {
      src: "/assets/cta-garden.webp",
      alt: "Thriving daylily garden at sunset",
    },
  },
} as const;
