import type { Quest } from '@/lib/quests';
import type { MiamiCRMRow } from './index';
import geocodedRaw from './miamiQuestLocations.geocoded.json';

export interface MiamiQuest extends Quest {
  address: string;
  concept: string;
  physicalReward: string;
}

const XP_BY_CATEGORY: Record<string, number> = {
  Foodie: 100,
  Culture: 130,
  Nightlife: 120,
  'Hidden Gems': 110,
  Wellness: 110,
  Outdoor: 115,
  Community: 90,
};

const IMAGES_BY_CATEGORY: Record<string, string[]> = {
  Foodie: [
    'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop',
  ],
  Culture: [
    'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop',
  ],
  Nightlife: [
    'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1575444758702-4a6b9222336e?w=400&h=300&fit=crop',
  ],
  'Hidden Gems': [
    'https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400&h=300&fit=crop',
  ],
  Wellness: [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=400&h=300&fit=crop',
  ],
  Outdoor: [
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=300&fit=crop',
  ],
  Community: [
    'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=300&fit=crop',
  ],
};

function inferCategory(questName: string): string {
  if (/caffeine chronicles|sweet tooth|taco quest/i.test(questName)) return 'Foodie';

  if (/brews & views/i.test(questName)) {
    if (/vizcaya|museum|garden/i.test(questName)) return 'Culture';
    if (/tea room|la mar/i.test(questName)) return 'Foodie';
    return 'Nightlife';
  }

  if (/literary escape|vinyl vibes|retro treasures/i.test(questName)) return 'Culture';

  // "Discover ..." quests — categorize by place name keywords
  const place = questName.replace(/^discover\s+/i, '').toLowerCase();

  if (/park|garden|trail|beach|boardwalk|hammock|river walk|underline|brickell key|south pointe|margaret pace|jungle island|kampong|fairchild|matheson|bayfront|lummus/i.test(place)) {
    return 'Outdoor';
  }
  if (/museum|art complex|gallery|theater|cinema|church|wolfsonian|bass |rubell|cubaocho|pamm|ica miami|superblue|el espacio|bakehouse|locust project|zine|moore building|española way|tower theater|coral gables museum|jewish museum|world erotic/i.test(place)) {
    return 'Culture';
  }
  if (/brewing|brewery|shaker|rum bar|e11even|club deuce|mac's|broken shaker|wakefield|veza sur|swizzle|over under|mana wynwood|wynwood garage/i.test(place)) {
    return 'Nightlife';
  }
  if (/sugar \(|swan|komodo|sexy fish|astra|mila|joia|versailles|azucar|ice cream|phuc|mignonette|cake thai|boia de|glass & vine|greenstreet cafe|atchana|lulu|monty's|bulla|caja|news cafe|stone crab|pubbelly|estefan|otl caf|coyo|kyu|bakan|time out market|chimi|b bistro|walls caffe|rosetta bakery|under the mango|all day|miam caf|el carajo|morelia/i.test(place)) {
    return 'Foodie';
  }
  if (/standard spa|wellness|fairchild/i.test(place)) return 'Wellness';
  if (/mall|marketplace|citadel|bayside|brickell city centre|midtown miami|worldcenter|miracle mile|kaseya|miamicentral|giralda|government center|regatta|wynwood marketplace|the webster/i.test(place)) {
    return 'Community';
  }

  return 'Hidden Gems';
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

function pickImage(category: string, index: number): string {
  const pool = IMAGES_BY_CATEGORY[category] ?? IMAGES_BY_CATEGORY['Hidden Gems'];
  return pool[index % pool.length];
}

const raw = geocodedRaw as unknown as MiamiCRMRow[];

let imageCounters: Record<string, number> = {};

export const MIAMI_QUESTS: MiamiQuest[] = raw
  .filter(row => row.coordinates?.lat != null)
  .map(row => {
    const questName = row['Quest Name'];
    const address = row['Address / Mapbox Coordinates'];
    const concept = row['Suggested Quest Concept'];
    const physicalReward = row['Suggested Reward'];
    const neighborhood = row.Neighborhood;
    const lat = row.coordinates!.lat as number;
    const lng = row.coordinates!.lng as number;

    const category = inferCategory(questName);
    const xp = XP_BY_CATEGORY[category] ?? 100;

    const idx = imageCounters[category] ?? 0;
    imageCounters[category] = idx + 1;
    const image = pickImage(category, idx);

    return {
      id: toSlug(questName),
      title: questName,
      neighborhood,
      category,
      reward: physicalReward,
      xp,
      distance: '',
      time: '20–30 min',
      image,
      x: 50,
      y: 50,
      lat,
      lng,
      address,
      concept,
      physicalReward,
    };
  });
