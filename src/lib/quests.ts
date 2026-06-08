/**
 * Mock quest catalogue powering the in-app Explore / Map / Favorites tabs.
 * Kept as static data so the MVP needs no quest backend. Each quest has stable
 * `id`s used for favorites, normalized `x`/`y` (0–100) for legacy grid views,
 * and real `lat`/`lng` GPS coordinates for the Mapbox map.
 */

export interface Quest {
  id: string;
  title: string;
  neighborhood: string;
  category: string;
  reward: string;
  xp: number;
  distance: string;
  time: string;
  image: string;
  /** Normalized map position (0–100). Kept for backward compat. */
  x: number;
  y: number;
  /** Real-world GPS coordinates used by the Mapbox map. */
  lat: number;
  lng: number;
  /** Street address — populated for CRM-backed quests. */
  address?: string;
  /** The playful real-world action the user must complete at the venue. */
  funky_action?: string | null;
  proof_method?: string | null;
  social_share_prompt?: string | null;
  staff_phrase?: string | null;
  estimated_time?: string | null;
}

export const QUESTS: Quest[] = [
  {
    id: 'wynwood-coffee-crawl',
    title: 'Hidden Wynwood Coffee Crawl',
    neighborhood: 'Wynwood',
    category: 'Hidden Gems',
    reward: 'Free Specialty Coffee',
    xp: 100,
    distance: '0.6 mi',
    time: '20 min',
    image: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400&h=300&fit=crop',
    x: 42, y: 30,
    lat: 25.8002, lng: -80.1986,
  },
  {
    id: 'south-beach-sunrise',
    title: 'South Beach Sunrise Reset',
    neighborhood: 'South Beach',
    category: 'Wellness',
    reward: 'Free Smoothie',
    xp: 110,
    distance: '0.5 mi',
    time: '25 min',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop',
    x: 78, y: 55,
    lat: 25.7854, lng: -80.1303,
  },
  {
    id: 'wynwood-mural-hunt',
    title: 'Wynwood Walls Mural Hunt',
    neighborhood: 'Wynwood',
    category: 'Culture',
    reward: 'Gallery Print',
    xp: 130,
    distance: '0.8 mi',
    time: '35 min',
    image: 'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=400&h=300&fit=crop',
    x: 38, y: 40,
    lat: 25.8058, lng: -80.1997,
  },
  {
    id: 'little-havana-cafecito',
    title: 'Little Havana Cafecito Trail',
    neighborhood: 'Little Havana',
    category: 'Foodie',
    reward: 'Free Pastelito',
    xp: 120,
    distance: '0.7 mi',
    time: '30 min',
    image: 'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?w=400&h=300&fit=crop',
    x: 22, y: 62,
    lat: 25.7679, lng: -80.2268,
  },
  {
    id: 'brickell-skyline-loop',
    title: 'Brickell Skyline Night Walk',
    neighborhood: 'Brickell',
    category: 'Nightlife',
    reward: 'Skip-the-Line Pass',
    xp: 150,
    distance: '0.9 mi',
    time: '30 min',
    image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400&h=300&fit=crop',
    x: 55, y: 70,
    lat: 25.7616, lng: -80.1927,
  },
  {
    id: 'coconut-grove-bayfront',
    title: 'Coconut Grove Bayfront Loop',
    neighborhood: 'Coconut Grove',
    category: 'Outdoor',
    reward: 'Bike Rental Hour',
    xp: 110,
    distance: '1.2 mi',
    time: '30 min',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=300&fit=crop',
    x: 35, y: 82,
    lat: 25.7283, lng: -80.2381,
  },
  {
    id: 'design-district-gallery',
    title: 'Design District Gallery Walk',
    neighborhood: 'Design District',
    category: 'Culture',
    reward: 'Designer Discount',
    xp: 140,
    distance: '0.8 mi',
    time: '40 min',
    image: 'https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=400&h=300&fit=crop',
    x: 48, y: 18,
    lat: 25.8149, lng: -80.1866,
  },
  {
    id: 'downtown-legends',
    title: 'Downtown Local Legends Quest',
    neighborhood: 'Downtown',
    category: 'Community',
    reward: 'Community Badge',
    xp: 90,
    distance: '0.6 mi',
    time: '25 min',
    image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&h=300&fit=crop',
    x: 60, y: 50,
    lat: 25.7745, lng: -80.1903,
  },
  {
    id: 'wynwood-sweet-caroline-karaoke',
    title: 'Sweet Caroline Karaoke Night',
    neighborhood: 'Wynwood',
    category: 'Nightlife',
    reward: 'Free Round of Drinks',
    xp: 130,
    distance: '0.4 mi',
    time: '45 min',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
    x: 44, y: 35,
    lat: 25.8025, lng: -80.1998,
  },
];

export const QUEST_CATEGORIES = [
  'All',
  'Foodie',
  'Nightlife',
  'Wellness',
  'Culture',
  'Outdoor',
  'Community',
  'Hidden Gems',
] as const;

export const getQuestById = (id: string) => QUESTS.find((q) => q.id === id);
