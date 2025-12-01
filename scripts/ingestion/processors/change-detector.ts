import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Tables } from '../../../src/lib/database.types';
import { ScrapedContestant, ScrapeResult } from '../sources/wikipedia';
import { withRetry } from '../utils/retry';

export type ChefRow = Tables<'chefs'>;
export type ChefShowRow = Tables<'chef_shows'>;
export type ShowRow = Tables<'shows'>;

export interface ExistingChefData {
  chef: ChefRow;
  shows: (ChefShowRow & { show: ShowRow })[];
}

export type ChangeType = 'new_chef' | 'update_season' | 'update_result' | 'no_change';

export interface DetectedChange {
  type: ChangeType;
  scraped: ScrapedContestant;
  existing: ExistingChefData | null;
  showSlug: string;
  confidence: number;
  details: string;
}

export interface ChangeDetectionResult {
  showSlug: string;
  newChefs: DetectedChange[];
  updates: DetectedChange[];
  unchanged: number;
  errors: string[];
}

const CONFIDENCE_BASE = {
  WIKIPEDIA_STRUCTURED: 0.85,
  WIKIPEDIA_GENERIC: 0.70,
  OTHER: 0.50,
};

const CONFIDENCE_BOOSTS = {
  HAS_SEASON: 0.05,
  HAS_RESULT: 0.05,
  HAS_HOMETOWN: 0.03,
  HAS_SEASON_NAME: 0.02,
};

const CONFIDENCE_THRESHOLDS = {
  UPDATE_SEASON: 0.85,
  UPDATE_RESULT: 0.80,
};

function calculateNewChefConfidence(
  scraped: ScrapedContestant,
  showSlug: string
): number {
  const isTopChef = showSlug === 'top-chef';
  const isWikipediaSource = scraped.sourceUrl.includes('wikipedia.org');
  
  let confidence = CONFIDENCE_BASE.OTHER;
  
  if (isWikipediaSource) {
    confidence = isTopChef 
      ? CONFIDENCE_BASE.WIKIPEDIA_STRUCTURED 
      : CONFIDENCE_BASE.WIKIPEDIA_GENERIC;
  }
  
  if (scraped.season) {
    confidence += CONFIDENCE_BOOSTS.HAS_SEASON;
  }
  if (scraped.result) {
    confidence += CONFIDENCE_BOOSTS.HAS_RESULT;
  }
  if (scraped.hometown) {
    confidence += CONFIDENCE_BOOSTS.HAS_HOMETOWN;
  }
  if (scraped.seasonName) {
    confidence += CONFIDENCE_BOOSTS.HAS_SEASON_NAME;
  }
  
  return Math.min(confidence, 0.99);
}

export async function loadExistingChefs(
  supabase: SupabaseClient<Database>
): Promise<Map<string, ExistingChefData>> {
  const chefMap = new Map<string, ExistingChefData>();

  try {
    const chefsResult = await withRetry(async () => {
      const res = await supabase.from('chefs').select('*');
      if (res.error) throw new Error(res.error.message);
      return res;
    });

    const chefs = (chefsResult.data || []) as ChefRow[];

    const chefShowsResult = await withRetry(async () => {
      const res = await supabase
        .from('chef_shows')
        .select('*, show:shows(*)');
      if (res.error) throw new Error(res.error.message);
      return res;
    });

    const chefShows = (chefShowsResult.data || []) as (ChefShowRow & { show: ShowRow })[];

    for (const chef of chefs) {
      const shows = chefShows.filter(cs => cs.chef_id === chef.id);
      chefMap.set(chef.slug, { chef, shows });
    }

    console.log(`   Loaded ${chefMap.size} existing chefs from database`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`   ❌ Failed to load existing chefs: ${msg}`);
  }

  return chefMap;
}

export async function getShowBySlug(
  supabase: SupabaseClient<Database>,
  slug: string
): Promise<ShowRow | null> {
  try {
    const res = await supabase
      .from('shows')
      .select('*')
      .eq('slug', slug)
      .limit(1);
    if (res.error) {
      return null;
    }
    const data = res.data as ShowRow[] | null;
    return data && data.length > 0 ? data[0] : null;
  } catch {
    return null;
  }
}

function detectChangesForContestant(
  scraped: ScrapedContestant,
  existing: ExistingChefData | null,
  showSlug: string
): DetectedChange {
  if (!existing) {
    return {
      type: 'new_chef',
      scraped,
      existing: null,
      showSlug,
      confidence: calculateNewChefConfidence(scraped, showSlug),
      details: `New chef discovered: ${scraped.name} from ${showSlug}`
    };
  }

  const existingShowEntry = existing.shows.find(s => s.show?.slug === showSlug);

  if (!existingShowEntry) {
    return {
      type: 'update_season',
      scraped,
      existing,
      showSlug,
      confidence: CONFIDENCE_THRESHOLDS.UPDATE_SEASON,
      details: `Chef ${scraped.name} appeared on new show: ${showSlug}`
    };
  }

  if (scraped.season && existingShowEntry.season !== scraped.season) {
    return {
      type: 'update_season',
      scraped,
      existing,
      showSlug,
      confidence: CONFIDENCE_THRESHOLDS.UPDATE_SEASON,
      details: `Season update for ${scraped.name}: ${existingShowEntry.season} → ${scraped.season}`
    };
  }

  if (scraped.result && existingShowEntry.result !== scraped.result) {
    const isPromotion = 
      (scraped.result === 'winner' && existingShowEntry.result !== 'winner') ||
      (scraped.result === 'finalist' && existingShowEntry.result === 'contestant');
    
    if (isPromotion) {
      return {
        type: 'update_result',
        scraped,
        existing,
        showSlug,
        confidence: CONFIDENCE_THRESHOLDS.UPDATE_RESULT,
        details: `Result update for ${scraped.name}: ${existingShowEntry.result} → ${scraped.result}`
      };
    }
  }

  return {
    type: 'no_change',
    scraped,
    existing,
    showSlug,
    confidence: 1.0,
    details: `No changes for ${scraped.name}`
  };
}

export async function detectChanges(
  supabase: SupabaseClient<Database>,
  scrapeResult: ScrapeResult,
  existingChefs: Map<string, ExistingChefData>
): Promise<ChangeDetectionResult> {
  const result: ChangeDetectionResult = {
    showSlug: scrapeResult.show.slug,
    newChefs: [],
    updates: [],
    unchanged: 0,
    errors: [...scrapeResult.errors]
  };

  for (const contestant of scrapeResult.contestants) {
    const existing = existingChefs.get(contestant.slug) || null;
    const change = detectChangesForContestant(contestant, existing, scrapeResult.show.slug);

    switch (change.type) {
      case 'new_chef':
        result.newChefs.push(change);
        break;
      case 'update_season':
      case 'update_result':
        result.updates.push(change);
        break;
      case 'no_change':
        result.unchanged++;
        break;
    }
  }

  return result;
}

export function shouldAutoApply(change: DetectedChange): boolean {
  return change.confidence >= 0.8 && change.type !== 'new_chef';
}

export function summarizeChanges(results: ChangeDetectionResult[]): void {
  let totalNew = 0;
  let totalUpdates = 0;
  let totalUnchanged = 0;

  console.log('\n📊 Change Detection Summary');
  console.log('─'.repeat(50));

  for (const result of results) {
    console.log(`\n   ${result.showSlug}:`);
    console.log(`     New chefs: ${result.newChefs.length}`);
    console.log(`     Updates: ${result.updates.length}`);
    console.log(`     Unchanged: ${result.unchanged}`);

    totalNew += result.newChefs.length;
    totalUpdates += result.updates.length;
    totalUnchanged += result.unchanged;

    if (result.errors.length > 0) {
      console.log(`     Errors: ${result.errors.length}`);
    }
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`   Total new chefs: ${totalNew} (→ review queue)`);
  console.log(`   Total updates: ${totalUpdates}`);
  console.log(`   Total unchanged: ${totalUnchanged}`);
}
