import type { GameCard, TriviaQuestion } from './types.ts'

export const gameCards: GameCard[] = [
  {
    id: 'game-city-trivia',
    key: 'city-trivia',
    title: 'City Trivia',
    blurb: 'Test your local knowledge',
    duration: '1–2 min',
    players: '1+ players',
    playable: true,
  },
  {
    id: 'game-quick-quiz',
    key: 'quick-quiz',
    title: 'Quick Quiz',
    blurb: 'Fast questions, big fun',
    duration: '1 min',
    players: '1+ players',
    playable: false,
  },
  {
    id: 'game-would-you-rather',
    key: 'would-you-rather',
    title: 'Would You Rather',
    blurb: 'Tough choices, fun debates',
    duration: '1–2 min',
    players: '2+ players',
    playable: false,
  },
  {
    id: 'game-spot-the-landmark',
    key: 'spot-the-landmark',
    title: 'Spot the Landmark',
    blurb: 'Can you find it?',
    duration: '1–2 min',
    players: '1+ players',
    playable: false,
  },
]

/**
 * City Trivia question bank — general Miami knowledge. Facts are common public
 * knowledge; fun facts are kept short and non-controversial.
 */
export const cityTriviaQuestions: TriviaQuestion[] = [
  {
    id: 'q-ocean-drive',
    prompt: 'Which iconic street runs along the beach in Miami Beach?',
    options: ['Ocean Drive', 'Collins Avenue', 'Lincoln Road', 'Biscayne Boulevard'],
    correctIndex: 0,
    funFact: 'Ocean Drive’s neon hotel signs are part of the protected Art Deco district.',
  },
  {
    id: 'q-murals',
    prompt: 'Which Miami neighborhood is famous for its outdoor murals?',
    options: ['Coconut Grove', 'Wynwood', 'Coral Gables', 'Key Biscayne'],
    correctIndex: 1,
    funFact: 'Wynwood’s warehouse walls became an open-air gallery in the late 2000s.',
  },
  {
    id: 'q-little-havana',
    prompt: 'What is the heart of Miami’s historic Cuban community called?',
    options: ['Little Haiti', 'Overtown', 'Little Havana', 'Allapattah'],
    correctIndex: 2,
    funFact: 'Little Havana’s main street, Calle Ocho, hosts one of the world’s biggest street festivals.',
  },
  {
    id: 'q-biscayne-bay',
    prompt: 'Which bay sits between mainland Miami and Miami Beach?',
    options: ['Tampa Bay', 'Florida Bay', 'Card Sound', 'Biscayne Bay'],
    correctIndex: 3,
    funFact: 'Biscayne Bay is a protected aquatic preserve nearly 35 miles long.',
  },
  {
    id: 'q-causeway',
    prompt: 'Which causeway links downtown Miami to South Beach?',
    options: ['MacArthur Causeway', 'Rickenbacker Causeway', 'Venetian Causeway', 'Broad Causeway'],
    correctIndex: 0,
    funFact: 'The MacArthur passes the cruise port — look for ships on your right heading east.',
  },
  {
    id: 'q-art-deco',
    prompt: 'Miami’s famous Art Deco district is found in which area?',
    options: ['Brickell', 'South Beach', 'Doral', 'El Portal'],
    correctIndex: 1,
    funFact: 'South Beach holds one of the largest collections of Art Deco buildings anywhere.',
  },
  {
    id: 'q-calle-ocho',
    prompt: 'What does “Calle Ocho” mean in English?',
    options: ['Old Street', 'Eighth Street', 'Ocho Plaza', 'Grand Avenue'],
    correctIndex: 1,
    funFact: 'Calle Ocho is officially SW 8th Street, running through Little Havana.',
  },
  {
    id: 'q-key-lime',
    prompt: 'The Key lime in Key lime pie is named after what?',
    options: ['A famous chef', 'The Florida Keys', 'A shade of green', 'Key Biscayne'],
    correctIndex: 1,
    funFact: 'The small, tart limes once grew commercially across the Florida Keys.',
  },
  {
    id: 'q-magic-city',
    prompt: 'What is Miami’s long-running nickname?',
    options: ['The Sunshine City', 'The Gate City', 'The Magic City', 'The Emerald City'],
    correctIndex: 2,
    funFact: 'The name stuck because early Miami seemed to grow overnight, “like magic.”',
  },
  {
    id: 'q-atlantic',
    prompt: 'Which body of water borders Miami Beach to the east?',
    options: ['Gulf of Mexico', 'Caribbean Sea', 'Biscayne Bay', 'Atlantic Ocean'],
    correctIndex: 3,
    funFact: 'The Gulf Stream flows just offshore, keeping the water warm year-round.',
  },
  {
    id: 'q-domino-park',
    prompt: 'Domino Park, famous for its daily games, is in which neighborhood?',
    options: ['Little Havana', 'Wynwood', 'Midtown', 'Edgewater'],
    correctIndex: 0,
    funFact: 'Its formal name is Máximo Gómez Park — dominoes run from morning to night.',
  },
  {
    id: 'q-miami-river',
    prompt: 'Which river flows through downtown Miami into the bay?',
    options: ['The New River', 'The Miami River', 'The Hillsboro River', 'The Shark River'],
    correctIndex: 1,
    funFact: 'The Miami River was a trade route long before the city existed.',
  },
]
