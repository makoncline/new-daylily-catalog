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
    title: "Let Your Garden Bloom Online",
    description:
      "Your daylilies tell a story worth sharing. Create professional listings in minutes using our database of 100,000+ registered cultivars, organize your collection your way, and join a community of growers who see the beauty in every detail.",
    backgroundImage: {
      src: "/assets/hero-garden.webp",
      alt: "Beautiful daylily garden at golden hour",
    },
    features: [
      { emoji: "📚", text: "Tap into trusted cultivar knowledge" },
      { emoji: "🖼️", text: "Showcase your garden's beauty" },
      { emoji: "🗂️", text: "Organize with purpose" },
      { emoji: "🌱", text: "Connect with fellow growers" },
    ],
    cta: {
      title: "Ready to grow together?",
      buttonText: "Create your catalog",
      subtitle: "If you already have an account, we'll log you in",
    },
  },
  features: {
    title: "Cultivate Your Digital Garden",
    description:
      "Transform your collection into a thriving digital showcase with tools that make organizing and sharing your daylilies feel as natural as growing them.",
    cards: [
      {
        image: {
          src: "/assets/catalog-blooms.webp",
          alt: "Professional daylily catalog interface",
        },
        title: "Blooms in the Spotlight",
        description:
          "Give each daylily its moment to shine with beautiful galleries and trusted data. Create listings that blend official records with your growing expertise.",
        features: [
          { icon: Flower2, text: "Auto-fill from official records" },
          { icon: ImageIcon, text: "Multiple photos per listing" },
          { icon: Info, text: "Public and private notes" },
        ],
      },
      {
        image: {
          src: "/assets/collage.png",
          alt: "Daylily collection management interface",
        },
        title: "Gardens Within Gardens",
        description:
          "Arrange your daylilies into collections that tell different stories - showcase gardens, seasonal displays, or curated sales lists. As intuitive as planning your next garden bed.",
        features: [
          { icon: ListChecks, text: "Create custom lists" },
          { icon: ArrowRight, text: "Quick filters and search" },
          { icon: Info, text: "Track inventory easily" },
        ],
      },
      {
        image: {
          src: "/assets/wild.png",
          alt: "Garden profile and bio interface",
        },
        title: "A Place to Grow",
        description:
          "Turn your profile into a gathering place where fellow enthusiasts can discover your story, explore your collection, and connect with your garden's vision.",
        features: [
          { icon: ImageIcon, text: "Garden photo galleries" },
          { icon: Info, text: "Professional profile" },
          { icon: ArrowRight, text: "Easy contact options" },
        ],
      },
      {
        image: {
          src: "/assets/bouquet.png",
          alt: "Daylily database interface",
        },
        title: "Instant Expertise",
        description:
          "Tap into our collection of 100,000+ registered cultivars. Add verified details to your listings in seconds, bringing authority and accuracy to every bloom you share.",
        features: [
          { icon: Flower2, text: "Complete cultivar data" },
          { icon: ImageIcon, text: "Official photos" },
          { icon: Info, text: "Detailed specifications" },
        ],
      },
    ],
  },
  database: {
    title: "Time to Share Your Blooms",
    description:
      "You've cultivated something special. Now it's time to give your garden the digital home it deserves, alongside fellow growers who share your passion for perfect blooms.",
    image: {
      src: "/assets/windingPath.png",
      alt: "Daylily database interface",
    },
  },
  finalCta: {
    title: "Let's Grow Something Beautiful",
    description:
      "Your digital garden awaits. Join fellow enthusiasts who've discovered the perfect way to share their growing passion.",
    buttonText: "Create your catalog",
    backgroundImage: {
      src: "/assets/cta-garden.webp",
      alt: "Thriving daylily garden at sunset",
    },
  },
} as const;
