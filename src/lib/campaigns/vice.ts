/**
 * VICE — THE CITY IS YOUR PLAYGROUND (/vice).
 *
 * An unofficial SideQuests concept showing how a brand activation runs on the
 * existing quest engine. Everything here is concept content until locations,
 * activities and participation terms are validated:
 *  - No brand has agreed to this campaign; `partners` stays empty.
 *  - Every location is a public street, district or park. Nothing asks a
 *    player to enter private or ticketed property, and no venue QR is implied.
 *  - Rewards are the standard tiers (src/lib/app/rewards.ts). No redeemable
 *    prize is offered.
 *
 * `liveQuestTitle` points a mission at the Miami Essentials quest covering the
 * same public place (data/generated/miami-essentials). When that quest is
 * active, the mission plays through it and shows that quest's own rewards.
 */

import type { CampaignConfig } from "./types";

export const VICE_CAMPAIGN: CampaignConfig = {
  slug: "vice",
  status: "concept",
  name: "VICE",
  tagline: "THE CITY IS YOUR PLAYGROUND",
  intro:
    "Turn Miami into your own adventure. Discover hidden locations, complete real-world missions, earn XP, and unlock new experiences across the city.",
  disclosure:
    "Independent SideQuests concept. Not affiliated with or endorsed by Rockstar Games or Take-Two Interactive.",
  duration: null,
  partners: [],
  head: {
    title: "VICE — The City Is Your Playground · a SideQuests concept",
    description: "A SideQuests concept: real-world missions across Miami.",
    themeColor: "#10152B",
    noindex: true,
    fontsHref:
      "https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;900&display=swap",
  },
  analyticsPage: "vice",
  mapCenter: [-80.178, 25.781],
  missions: [
    {
      id: "neon-nights",
      number: "01",
      title: "Neon Nights",
      neighborhood: "Miami Beach",
      place: "Ocean Drive, Art Deco district",
      lat: 25.780287,
      lng: -80.130344,
      difficulty: "easy",
      estimatedTime: "30 min",
      objective:
        "Discover Miami Beach's Art Deco district after dark and capture your own photo of the neighborhood's neon architecture.",
      verification: ["photo"],
      art: "neon",
      artAlt: "Illustration of an Art Deco hotel front glowing with neon at night, framed by palm trees.",
      liveQuestTitle: "Art Deco Color Walk",
      note: "Shoot from the public sidewalk. No hotel or venue entry is needed.",
    },
    {
      id: "concrete-canvas",
      number: "02",
      title: "Concrete Canvas",
      neighborhood: "Wynwood",
      place: "Wynwood's public mural streets",
      lat: 25.801139,
      lng: -80.199658,
      difficulty: "medium",
      estimatedTime: "30 min",
      objective:
        "Explore Wynwood's public street art and document a mural or creative installation that stops you in your tracks.",
      verification: ["gps", "photo"],
      art: "canvas",
      artAlt: "Illustration of a warehouse wall covered in bold geometric mural shapes under a warm sky.",
      liveQuestTitle: "Wynwood Mural Chase",
      note: "Public streets only. Ticketed galleries and private lots are not part of this mission.",
    },
    {
      id: "calle-ocho-chronicles",
      number: "03",
      title: "Calle Ocho Chronicles",
      neighborhood: "Little Havana",
      place: "Calle Ocho (SW 8th Street)",
      lat: 25.765644,
      lng: -80.219973,
      difficulty: "medium",
      estimatedTime: "30 min",
      objective:
        "Discover a cultural landmark along Calle Ocho and answer a short question about the street you are standing on.",
      verification: ["gps", "question"],
      art: "calle",
      artAlt: "Illustration of a colorful Little Havana street with arched doorways, striped awnings and domino tiles.",
      liveQuestTitle: "Walk of Fame on Calle Ocho",
      question: {
        prompt: "Calle Ocho is the everyday name for which Miami street?",
        options: ["SW 8th Street", "NW 2nd Avenue", "Ocean Drive"],
        answer: "SW 8th Street",
      },
    },
    {
      id: "skyline-hunter",
      number: "04",
      title: "Skyline Hunter",
      neighborhood: "Downtown Miami",
      place: "Bayfront Park",
      lat: 25.77538,
      lng: -80.186166,
      difficulty: "hard",
      estimatedTime: "45 min",
      objective:
        "Reach the public bayfront viewpoint and capture a creative photograph of the Downtown skyline.",
      verification: ["gps", "photo"],
      art: "skyline",
      artAlt: "Illustration of the Downtown Miami skyline at sunset reflected in Biscayne Bay.",
      liveQuestTitle: "Bayfront Park Skyline",
    },
    {
      id: "miami-circuit",
      number: "05",
      title: "The Miami Circuit",
      neighborhood: "Citywide",
      place: "Four neighborhoods, one run",
      difficulty: "legendary",
      estimatedTime: "Half a day",
      objective:
        "Finish all four missions across Miami Beach, Wynwood, Little Havana and Downtown to close the circuit.",
      verification: ["records"],
      art: "circuit",
      artAlt: "Illustration of a glowing route linking four points across a stylized map of Miami.",
      requires: ["neon-nights", "concrete-canvas", "calle-ocho-chronicles", "skyline-hunter"],
    },
  ],
};
