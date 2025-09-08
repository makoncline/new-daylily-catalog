"use client";

import { useEffect, useState } from "react";
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
import { Star } from "lucide-react";
import Link from "next/link";
import { H1, H2, P, Muted } from "@/components/typography";
import { homePageContent } from "@/config/home-page-content";

function SignUpButton({ className }: { className?: string }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const text = "Create your catalog";

  if (!isMounted) {
    return (
      <Button size="lg" variant="gradient" className={className} disabled>
        {text}
      </Button>
    );
  }

  return (
    <Button size="lg" variant="gradient" className={className} asChild>
      <div>
        <SignedIn>
          <Link href="/dashboard">{text}</Link>
        </SignedIn>
        <SignedOut>
          <ClerkSignUpButton mode="modal" forceRedirectUrl="/dashboard">
            {text}
          </ClerkSignUpButton>
        </SignedOut>
      </div>
    </Button>
  );
}

export default function HomePageClient() {
  const { hero, features, database, finalCta } = homePageContent;

  return (
    <div className="flex flex-col items-center gap-24">
      {/* Hero Section */}
      <section className="relative flex w-full flex-col items-center justify-center gap-6 p-6 py-8 md:py-16 lg:flex-row">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <div className="bg-foreground/60 absolute inset-0 z-10 backdrop-blur-[2px]" />
          <Image
            src={hero.backgroundImage.src}
            alt={hero.backgroundImage.alt}
            fill
            sizes="100vw"
            className="object-cover object-center"
            priority
          />
        </div>

        {/* Content */}
        <div className="text-background relative z-20 flex max-w-2xl flex-col items-start gap-4">
          {/* Badge */}
          <div className="bg-foreground/10 flex items-center gap-2 rounded-full px-6 py-2 text-sm backdrop-blur-sm">
            <hero.badge.icon className="h-6 w-6" />
            <div className="flex flex-col items-center">
              <span>{hero.badge.text}</span>
              <div className="flex gap-1">
                {Array.from({ length: hero.badge.stars }, (_, i) => (
                  <Star key={i} className="h-3 w-3" fill="currentColor" />
                ))}
              </div>
            </div>
          </div>

          <H1 className="text-4xl sm:text-6xl">{hero.title}</H1>
          <P className="text-background/90 text-lg">{hero.description}</P>

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
        <div className="bg-card relative z-20 flex w-full max-w-md rounded-lg p-2 shadow-lg lg:w-1/3">
          <div className="bg-foreground text-primary-foreground flex w-full flex-col gap-4 rounded-md p-6">
            <H2 className="text-primary-foreground text-xl">
              {hero.cta.title}
            </H2>
            <div className="flex flex-col items-center gap-2">
              <SignUpButton className="w-full" />
              <Muted className="text-center text-xs">{hero.cta.subtitle}</Muted>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto">
        <div className="mb-12 text-center">
          <H2 className="mb-4 text-3xl">{features.title}</H2>
          <P className="text-muted-foreground mx-auto max-w-2xl text-lg">
            {features.description}
          </P>
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
                    sizes="500px"
                    className="object-cover"
                  />
                </div>
                <CardTitle>{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-muted-foreground grid gap-2 text-sm">
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

      {/* Database Section */}
      <section className="container mx-auto">
        <div className="mb-12">
          <H2 className="mb-4 text-3xl">{database.title}</H2>
          <P className="text-muted-foreground mb-8 text-lg">
            {database.description}
          </P>
        </div>

        <div className="relative h-96 overflow-hidden rounded-lg">
          <Image
            src={database.image.src}
            alt={database.image.alt}
            fill
            sizes="500px"
            className="object-cover"
          />
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative w-full py-24">
        <div className="absolute inset-0">
          <div className="bg-foreground/60 absolute inset-0 z-10" />
          <Image
            src={finalCta.backgroundImage.src}
            alt={finalCta.backgroundImage.alt}
            fill
            sizes="500px"
            className="object-cover object-center"
          />
        </div>

        <div className="text-background relative z-20 mx-auto max-w-4xl space-y-8 px-4 text-center">
          <H2 className="mb-4 text-3xl">{finalCta.title}</H2>
          <P className="text-background/90 mb-8 text-lg">
            {finalCta.description}
          </P>
          <SignUpButton />
        </div>
      </section>
    </div>
  );
}
