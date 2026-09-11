import type { NewsStory } from './types.ts'

/**
 * Fictional sample news for the prototype. Real public places appear editorially,
 * but every story, outlet, and detail is invented — nothing here is live news.
 */
export const newsStories: NewsStory[] = [
  {
    id: 'news-rail-pilot',
    slug: 'late-night-rail-pilot',
    category: 'local',
    kicker: 'Local · Miami',
    headline: 'Late-night rail pilot extends weekend service across the bay',
    summary:
      'A six-month transit pilot adds hourly late-night trains between downtown and the beach on weekends, aimed at nightlife workers and event crowds.',
    keyPoints: [
      'Weekend service now runs until 2 a.m. through the fall',
      'New shuttle connections at both ends of the line',
      'Ridership will decide whether the pilot becomes permanent',
    ],
    source: 'Biscayne Bulletin',
    publishedAgoMinutes: 42,
    readMinutes: 2,
    featured: true,
    art: { seed: 11, hue: 'lime', motif: 'route' },
    demo: true,
  },
  {
    id: 'news-mural-festival',
    slug: 'wynwood-mural-festival',
    category: 'culture',
    kicker: 'Culture · Wynwood',
    headline: 'Mural festival takes over NW 2nd Avenue this weekend',
    summary:
      'Forty artists repaint ten blocks of Wynwood walls over three days, with open studios, food trucks, and free walking tours each evening.',
    keyPoints: [
      'Painting runs Friday through Sunday, tours start at 6 p.m.',
      'Street closures around NW 2nd Avenue all weekend',
      'Finished walls join the neighborhood’s permanent collection',
    ],
    source: 'The 305 Desk',
    publishedAgoMinutes: 95,
    readMinutes: 3,
    art: { seed: 23, hue: 'ember', motif: 'grid' },
    demo: true,
  },
  {
    id: 'news-climate-summit',
    slug: 'climate-summit-final-day',
    category: 'world',
    kicker: 'World',
    headline: 'Coastal cities push for storm-funding deal as summit enters final day',
    summary:
      'Delegates from low-lying cities, Miami among them, are pressing for a shared resilience fund before the international summit closes tonight.',
    keyPoints: [
      'Draft text includes coastal-infrastructure grants',
      'Final vote expected late tonight',
      'Miami’s delegation backs the proposal',
    ],
    source: 'Bayfront Report',
    publishedAgoMinutes: 130,
    readMinutes: 4,
    art: { seed: 37, hue: 'ocean', motif: 'wave' },
    demo: true,
  },
  {
    id: 'news-jobs-report',
    slug: 'south-florida-jobs-steady',
    category: 'business',
    kicker: 'Business',
    headline: 'South Florida job growth stays steady in quarterly report',
    summary:
      'Hospitality and health care led hiring for a third straight quarter, while office vacancies continued a slow decline across the urban core.',
    keyPoints: [
      'Hospitality hiring up for the third quarter in a row',
      'Wages grew fastest in health care roles',
      'Downtown office vacancy fell slightly again',
    ],
    source: 'Coral Ledger',
    publishedAgoMinutes: 180,
    readMinutes: 3,
    art: { seed: 41, hue: 'night', motif: 'skyline' },
    demo: true,
  },
  {
    id: 'news-game-one',
    slug: 'miami-takes-game-one',
    category: 'sports',
    kicker: 'Sports',
    headline: 'Miami takes game one at home behind a late fourth-quarter run',
    summary:
      'A 12–2 closing run sealed the opener downtown. Game two tips off Thursday night before the series heads north for the weekend.',
    keyPoints: [
      'Miami closed the game on a 12–2 run',
      'Game two is Thursday at home',
      'The series shifts away for games three and four',
    ],
    source: 'Magic City Memo',
    publishedAgoMinutes: 55,
    readMinutes: 2,
    art: { seed: 53, hue: 'lime', motif: 'orbs' },
    demo: true,
  },
  {
    id: 'news-design-district',
    slug: 'design-district-art-nights',
    category: 'culture',
    kicker: 'Culture · Design District',
    headline: 'Art walk nights return to the Design District next month',
    summary:
      'Monthly gallery nights are back with extended hours, outdoor installations, and a free trolley loop connecting a dozen participating spaces.',
    keyPoints: [
      'First night of the season lands next Friday',
      'A free trolley loops the district until 11 p.m.',
      'A dozen galleries confirmed extended hours',
    ],
    source: 'The 305 Desk',
    publishedAgoMinutes: 240,
    readMinutes: 2,
    art: { seed: 67, hue: 'dusk', motif: 'grid' },
    demo: true,
  },
  {
    id: 'news-beach-cleanup',
    slug: 'beach-cleanup-record',
    category: 'local',
    kicker: 'Local · Miami Beach',
    headline: 'Volunteers set a weekend record at the shoreline cleanup',
    summary:
      'More than eight hundred volunteers cleared two tons of debris from five beaches — the largest single-weekend turnout the organizers have logged.',
    keyPoints: [
      'Five beach sites cleaned in one weekend',
      'Two tons of debris collected in total',
      'The next cleanup is planned for early next month',
    ],
    source: 'Biscayne Bulletin',
    publishedAgoMinutes: 300,
    readMinutes: 2,
    art: { seed: 71, hue: 'ocean', motif: 'wave' },
    demo: true,
  },
  {
    id: 'news-tech-campus',
    slug: 'tech-campus-breaks-ground',
    category: 'business',
    kicker: 'Business · Downtown',
    headline: 'New tech campus breaks ground near the river walk',
    summary:
      'The mixed-use campus promises lab space, a public plaza, and a waterfront path segment, with the first buildings opening in two years.',
    keyPoints: [
      'Construction starts this month along the river',
      'Plans include a public plaza and waterfront path',
      'First phase opens in roughly two years',
    ],
    source: 'Coral Ledger',
    publishedAgoMinutes: 360,
    readMinutes: 3,
    art: { seed: 83, hue: 'night', motif: 'skyline' },
    demo: true,
  },
  {
    id: 'news-food-truck-rally',
    slug: 'food-truck-rally-bayfront',
    category: 'local',
    kicker: 'Local · Bayfront Park',
    headline: 'Food truck rally rolls into Bayfront Park on Friday',
    summary:
      'Thirty trucks, live DJs, and a sunset market take over the park lawn from 5 to 11 p.m., with free entry and bike valet at both gates.',
    keyPoints: [
      'Thirty food trucks confirmed for Friday',
      'Free entry, 5 to 11 p.m. on the main lawn',
      'Bike valet available at both park gates',
    ],
    source: 'Magic City Memo',
    publishedAgoMinutes: 20,
    readMinutes: 2,
    art: { seed: 89, hue: 'ember', motif: 'orbs' },
    demo: true,
  },
]

export const featuredStory: NewsStory = newsStories.find((s) => s.featured) ?? newsStories[0]!
