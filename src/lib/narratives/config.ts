/**
 * Narrative System Configuration
 *
 * Centralized configuration for narrative generation and display.
 * All magic numbers and constants related to narratives should live here.
 */

export const NARRATIVE_CONFIG = {
  // Chef narrative settings
  CHEF: {
    WORD_COUNT_MIN: 350,
    WORD_COUNT_MAX: 450,
    PARAGRAPH_COUNT: 3,
    HEADINGS: ['Culinary Roots', 'Rise to Fame', 'Where to Dine Today'] as const,
    HEADING_IDS: ['culinary-roots', 'rise-to-fame', 'where-to-dine'] as const,
    // Content distribution percentages
    SECTION_WEIGHTS: {
      ROOTS: 0.25,      // 25% - Training and early career
      TV: 0.35,         // 35% - TV breakthrough
      RESTAURANTS: 0.40 // 40% - Current dining destinations
    }
  },

  // Restaurant narrative settings
  RESTAURANT: {
    WORD_COUNT_MIN: 200,
    WORD_COUNT_MAX: 275,
    PARAGRAPH_COUNT: 3,
    HEADINGS: ['Chef\'s Vision', 'What to Expect', 'Why Visit'] as const,
    HEADING_IDS: ['chefs-vision', 'what-to-expect', 'why-visit'] as const,
    // Content distribution percentages
    SECTION_WEIGHTS: {
      VISION: 0.30,     // 30% - Chef connection and concept
      EXPERIENCE: 0.45, // 45% - Dining experience
      VERDICT: 0.25     // 25% - Why visit
    }
  },

  // City narrative settings
  CITY: {
    WORD_COUNT_MIN: 250,
    WORD_COUNT_MAX: 350,
    PARAGRAPH_COUNT: 3
  },

  // LLM generation settings
  GENERATION: {
    MAX_TOKENS_CHEF: 2000,
    MAX_TOKENS_RESTAURANT: 1500,
    MAX_TOKENS_CITY: 2000,
    TEMPERATURE: 0.7,
    MIN_VALID_LENGTH: 50 // Minimum characters to consider valid
  },

  // Backfill script settings
  BACKFILL: {
    DELAY_MS: 100,                    // Delay between API calls
    CONFIRMATION_DELAY_MS: 5000,      // 5 second countdown before running
    // Token estimates for cost calculation (gpt-4.1-mini with Flex)
    TOKENS_PER_CHEF: 1100,            // ~600 prompt + ~500 completion
    TOKENS_PER_RESTAURANT: 800,       // ~400 prompt + ~400 completion
    COST_PER_MILLION_TOKENS: 1.00     // gpt-4.1-mini Flex: $0.20 input + $0.80 output blended
  }
} as const;

// Type exports for use in other files
export type ChefHeading = typeof NARRATIVE_CONFIG.CHEF.HEADINGS[number];
export type RestaurantHeading = typeof NARRATIVE_CONFIG.RESTAURANT.HEADINGS[number];
