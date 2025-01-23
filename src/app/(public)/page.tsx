"use client";

import {
  SignUpButton as ClerkSignUpButton,
  SignedIn,
  SignedOut,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Flower2,
  ListChecks,
  Image as ImageIcon,
  Info,
  ArrowRight,
  Award,
  Star,
} from "lucide-react";
import Link from "next/link";

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

function SignUpButton({ className }: { className?: string }) {
  return (
    <>
      <SignedIn>
        <Button size="lg" variant="gradient" className={className} asChild>
          <Link href="/dashboard">Create your catalog</Link>
        </Button>
      </SignedIn>
      <SignedOut>
        <Button size="lg" variant="gradient" className={className} asChild>
          <ClerkSignUpButton mode="modal" forceRedirectUrl="/dashboard">
            Create your catalog
          </ClerkSignUpButton>
        </Button>
      </SignedOut>
    </>
  );
}

export default function HomePage() {
  const { hero, features, database, finalCta } = homePageContent;

  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative flex min-h-[85vh] w-full flex-col items-center justify-center gap-6 p-8 lg:flex-row">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-[2px]" />
          <Image
            src={hero.backgroundImage.src}
            alt={hero.backgroundImage.alt}
            fill
            className="object-cover object-center"
            priority
          />
        </div>

        {/* Content */}
        <div className="relative z-20 flex max-w-2xl flex-col items-start gap-6 text-white">
          {/* Badge */}
          <div className="flex items-center gap-2 rounded-full bg-white/10 px-6 py-2 text-sm backdrop-blur-sm">
            <hero.badge.icon className="h-6 w-6" />
            <div>
              <span>{hero.badge.text}</span>
              <div className="flex gap-1">
                {Array.from({ length: hero.badge.stars }, (_, i) => (
                  <Star key={i} className="h-3 w-3" fill="currentColor" />
                ))}
              </div>
            </div>
          </div>

          <h1 className="text-4xl font-bold sm:text-6xl">{hero.title}</h1>
          <p className="text-lg text-white/90">{hero.description}</p>

          {/* Feature List */}
          <div className="flex flex-col gap-4">
            {hero.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="text-lg">{feature.emoji}</span>
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="relative z-20 flex w-full max-w-md flex-col gap-4 rounded-lg border-8 border-secondary bg-primary p-6 shadow-lg lg:w-1/3">
          <h2 className="text-xl font-bold text-primary-foreground">
            {hero.cta.title}
          </h2>
          <div className="flex flex-col items-center gap-2">
            <SignUpButton className="w-full" />
            <p className="text-center text-xs text-muted-foreground">
              {hero.cta.subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-24">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold">{features.title}</h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {features.description}
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          {features.cards.map((card, index) => (
            <Card key={index} className="relative overflow-hidden">
              <CardHeader>
                <div className="relative mb-4 h-48 overflow-hidden rounded-lg">
                  <Image
                    src={card.image.src}
                    alt={card.image.alt}
                    fill
                    className="object-cover"
                  />
                </div>
                <CardTitle>{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2 text-sm text-muted-foreground">
                  {card.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-2">
                      <feature.icon className="h-4 w-4" />
                      {feature.text}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Database Integration Section */}
      <section className="w-full bg-muted/50 py-24">
        <div className="container mx-auto grid gap-12 px-4 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="mb-4 text-3xl font-bold">{database.title}</h2>
            <p className="mb-8 text-lg text-muted-foreground">
              {database.description}
            </p>
            <SignUpButton />
          </div>
          <div className="relative aspect-video w-full overflow-hidden rounded-lg">
            <Image
              src={database.image.src}
              alt={database.image.alt}
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative flex min-h-[50vh] w-full flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-[2px]" />
          <Image
            src={finalCta.backgroundImage.src}
            alt={finalCta.backgroundImage.alt}
            fill
            className="object-cover object-center"
          />
        </div>

        <div className="container relative z-20 mx-auto flex flex-col items-center px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white">
            {finalCta.title}
          </h2>
          <p className="mb-8 text-lg text-white/90">{finalCta.description}</p>
          <SignUpButton />
        </div>
      </section>
    </div>
  );
}
