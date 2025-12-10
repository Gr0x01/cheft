import { ChefNarrativeContext, RestaurantNarrativeContext, CityNarrativeContext } from './types';

export const CHEF_NARRATIVE_SYSTEM_PROMPT = `You are an expert food writer specializing in chef career narratives. Your task is to research and write compelling 250-300 word stories about TV chefs, emphasizing their journey before, during, and after their television appearances.

RESEARCH REQUIREMENTS:
- Search Wikipedia for chef background and career history
- Find articles about their TV show performance and highlights
- Research their restaurant ventures, awards, and achievements
- Look for interviews revealing their cooking philosophy and style
- Gather information about signature dishes and culinary innovations

STRUCTURE (REQUIRED - CRITICAL):
1. BEFORE THE SHOW (30% of content): Background before TV appearance
   - Early culinary training and experience
   - Career milestones that led to TV opportunity
   - Cooking style development

2. DURING THE SHOW (40% of content): TV performance emphasis
   - Which show(s) and season(s)
   - Performance highlights and memorable moments
   - Result (winner/finalist/contestant)
   - Signature dishes or techniques showcased
   - What set them apart from competitors

3. AFTER THE SHOW (30% of content): Post-TV success trajectory
   - How TV exposure shaped their career
   - Restaurant empire expansion
   - Awards and recognition earned
   - Current impact and influence

STYLE GUIDELINES:
- Active voice, engaging prose
- Professional food journalism tone
- Factual only - no speculation or invented details
- Cite sources mentally but DO NOT include citations in output
- Emphasize accomplishments and concrete achievements
- Target length: 250-300 words (strict)

OUTPUT FORMAT:
- Return EXACTLY 3 paragraphs separated by double newlines (\n\n)
- Paragraph 1: Before the show (background and early career)
- Paragraph 2: During the show (TV performance and highlights)
- Paragraph 3: After the show (post-TV success and current status)
- No headings, bullet points, or section markers
- No citations, brackets, or metadata
- No introductory phrases like "Here is..." or "This chef..."
- Just the narrative, ready to display on the page`;

export const RESTAURANT_NARRATIVE_SYSTEM_PROMPT = `You are an expert restaurant critic writing compelling descriptions of TV chef restaurants. Your task is to research and write a 150-200 word narrative about this restaurant.

RESEARCH REQUIREMENTS:
- Search for recent restaurant reviews from Eater, Michelin Guide, local press
- Find menu information and signature dishes
- Look for articles about the restaurant's concept and chef's vision
- Research the dining experience and atmosphere
- Check for awards, accolades, or special recognition

STRUCTURE (REQUIRED):
1. The Concept (30%): What makes this restaurant unique
   - Culinary vision and philosophy
   - Position in the chef's portfolio

2. The Cuisine (40%): Food and dining style
   - Cuisine type and culinary approach
   - Signature dishes or menu highlights
   - Price positioning and dining format

3. The Experience (30%): What diners can expect
   - Atmosphere and setting
   - Why it's worth visiting
   - Connection to chef's TV background and reputation

STYLE GUIDELINES:
- Professional restaurant review tone
- Factual and descriptive
- Highlight what makes it special
- No citations in output
- Target length: 150-200 words

OUTPUT FORMAT:
- Single continuous paragraph
- No headings or structure markers
- Just the narrative text`;

export const SHOW_DESCRIPTION_SYSTEM_PROMPT = `You are a food and entertainment writer specializing in cooking competition shows. Your task is to write a 2-3 sentence SEO-optimized description of a TV cooking show.

RESEARCH REQUIREMENTS:
- Search Wikipedia and entertainment sites for show history and format
- Find information about notable winners and contestants
- Research the show's cultural impact and longevity
- Look for unique aspects that distinguish it from other cooking shows

CONTENT REQUIREMENTS:
1. Show Format (40%): What makes this show unique
   - Competition structure or format
   - Network and premiere information
   - Any special characteristics

2. Impact & Notable Alumni (40%): Why it matters
   - Number of seasons or years on air
   - Notable winners or contestants who became successful chefs
   - Cultural significance or awards

3. Restaurant Connection (20%): Value for site users
   - How many chef restaurants exist from this show
   - Why users should care about chefs from this show

STYLE GUIDELINES:
- Concise, informative SEO tone
- Factual only - no speculation
- No citations in output
- Target length: 2-3 sentences (60-100 words MAX)
- First sentence should be a strong hook

OUTPUT FORMAT:
- 2-3 sentences only
- No headings or markers
- Just the description text`;

export const SEASON_DESCRIPTION_SYSTEM_PROMPT = `You are a food and entertainment writer specializing in cooking competition shows. Your task is to write a 1-2 sentence SEO-optimized description of a specific season of a TV cooking show.

RESEARCH REQUIREMENTS:
- Search for "{show name} season {number}" information
- Find the season's filming location/theme if applicable
- Research the winner and their post-show success
- Look for memorable moments or standout contestants

CONTENT REQUIREMENTS:
1. Season Context (30%): Setting or theme
   - Location if applicable (e.g., "Set in Chicago" for Top Chef)
   - Season theme or special format
   - Year it aired

2. Winner Focus (50%): Main outcome
   - Winner's name (if provided in context)
   - Their defining moment or achievement in the season
   - Their post-show success (restaurants opened, awards)

3. Notable Contestants (20%): Other standouts
   - Finalists or memorable chefs (if provided)
   - Current restaurant count from this season

STYLE GUIDELINES:
- Very concise, punchy SEO tone
- Lead with the most interesting fact (usually the winner)
- Factual only - no speculation
- No citations in output
- Target length: 1-2 sentences (40-60 words MAX)

OUTPUT FORMAT:
- 1-2 sentences only
- No headings or markers
- Just the description text`;

export const CITY_NARRATIVE_SYSTEM_PROMPT = `You are a food and travel writer specializing in city dining scenes. Your task is to research and write a 250-350 word overview of the TV chef restaurant scene in this city.

RESEARCH REQUIREMENTS:
- Search for "{city} food scene" and "{city} TV chef restaurants"
- Find articles from Eater, local food publications
- Research the city's culinary reputation and landmarks
- Look for Michelin Guide presence or other prestige indicators
- Identify the most notable TV chef restaurants in the area

STRUCTURE (REQUIRED):
1. TV Chef Presence (25%): Why this city matters
   - Number of TV chef restaurants
   - Notable chef names and their shows
   - City's importance in TV chef dining landscape

2. Notable Restaurants (35%): Specific highlights
   - Mention top 3-5 restaurants BY NAME
   - Include chef names and their TV credentials
   - Note any Michelin stars or major awards
   - Highlight cuisine diversity

3. Culinary Landscape (25%): The broader scene
   - Range of price points and dining styles
   - Cuisine types represented
   - What makes this city's chef scene unique

4. Visitor Takeaway (15%): Practical context
   - What food tourists should know
   - Best neighborhoods or areas for TV chef dining
   - Overall value proposition

STYLE GUIDELINES:
- Engaging travel/food writing style
- Factual and informative
- Mention specific restaurant names (context provided in data)
- No citations in output
- Target length: 250-350 words

OUTPUT FORMAT:
- Single continuous paragraph or 2-3 short paragraphs
- No headings or bullet points
- Just the narrative text`;

export function buildChefNarrativePrompt(context: ChefNarrativeContext): string {
  const primaryShow = context.shows.find(s => s.is_primary) || context.shows[0];
  const showsList = context.shows
    .map(s => `${s.show_name}${s.season ? ` (Season ${s.season})` : ''}: ${s.result || 'contestant'}`)
    .join(', ');
  
  const restaurantsList = context.restaurants
    .filter(r => r.status === 'open')
    .map(r => `${r.name} in ${r.city}${r.state ? `, ${r.state}` : ''}`)
    .join('; ');

  return `Research and write a 250-300 word career narrative for chef ${context.name}.

CHEF CONTEXT:
Name: ${context.name}
Current Position: ${context.current_position || 'Chef/Restaurateur'}
TV Shows: ${showsList}
Primary Show: ${primaryShow?.show_name || 'N/A'}${primaryShow?.season ? ` Season ${primaryShow.season}` : ''}
Show Result: ${primaryShow?.result || 'contestant'}
James Beard Status: ${context.james_beard_status || 'none'}
Restaurant Count: ${context.restaurant_count} (${context.cities.join(', ')})
Open Restaurants: ${restaurantsList || 'N/A'}
Current Bio: ${context.mini_bio || 'No bio available'}

TASK:
Write a compelling narrative emphasizing their journey BEFORE, DURING, and AFTER appearing on ${primaryShow?.show_name || 'TV shows'}.

Use web search to find:
1. Background before TV (training, early career, path to the show)
2. TV show performance (season highlights, memorable moments, what they showcased)
3. Post-TV trajectory (how the show launched their restaurant success, awards, current impact)

Remember: 40% of the narrative should focus on their TV show journey and accomplishments.`;
}

export function buildRestaurantNarrativePrompt(context: RestaurantNarrativeContext): string {
  const chefShows = context.chef_shows
    .map(s => `${s.show_name} ${s.result || 'contestant'}`)
    .join(', ');

  return `Research and write a 150-200 word description of ${context.name}, a restaurant by TV chef ${context.chef_name}.

RESTAURANT CONTEXT:
Name: ${context.name}
Chef: ${context.chef_name}
Location: ${context.city}${context.state ? `, ${context.state}` : ''}
Cuisine: ${context.cuisine_tags?.join(', ') || 'Not specified'}
Price: ${context.price_tier || 'N/A'}
Rating: ${context.google_rating ? `${context.google_rating} stars (${context.google_review_count} reviews)` : 'N/A'}
Status: ${context.status}
Chef's TV Shows: ${chefShows || 'N/A'}
Chef's Other Restaurants: ${context.other_restaurant_count} locations

TASK:
Write a compelling description covering:
1. The concept and what makes it unique
2. Cuisine style and signature dishes
3. Dining experience and atmosphere
4. How it fits into ${context.chef_name}'s restaurant portfolio

Use web search to find recent reviews, menu information, and articles about the restaurant.`;
}

export function buildShowDescriptionPrompt(context: { name: string; network: string | null }): string {
  return `Research and write a 2-3 sentence SEO description for the TV show "${context.name}".

SHOW CONTEXT:
Name: ${context.name}
Network: ${context.network || 'Unknown'}

TASK:
Write a concise, engaging description that:
1. Explains what kind of show this is (format, competition style)
2. Mentions its cultural impact or notable achievements
3. Hints at why viewers/diners should care about chefs from this show

Use web search to find information about the show's history, format, and notable winners.`;
}

export function buildSeasonDescriptionPrompt(context: {
  showName: string;
  season: string;
  network: string | null;
  winner: { name: string; chefId: string } | null;
  chefCount: number;
  restaurantCount: number;
}): string {
  const winnerInfo = context.winner
    ? `Winner: ${context.winner.name}`
    : 'Winner information not available';

  return `Research and write a 1-2 sentence SEO description for ${context.showName} Season ${context.season}.

SEASON CONTEXT:
Show: ${context.showName}
Season: ${context.season}
Network: ${context.network || 'Unknown'}
${winnerInfo}
Chefs from this season: ${context.chefCount}
Restaurants: ${context.restaurantCount}

TASK:
Write a punchy description that:
1. Leads with the most interesting fact (winner, location, or theme)
2. Mentions the winner's post-show success if known
3. Hints at the season's significance or memorable moments

Use web search to find information about this specific season.`;
}

export function buildCityNarrativePrompt(context: CityNarrativeContext): string {
  const topRestaurants = context.top_restaurants
    .slice(0, 5)
    .map(r => {
      const stars = r.michelin_stars ? ` (${r.michelin_stars}⭐)` : '';
      return `${r.name} by ${r.chef_name}${stars}`;
    })
    .join(', ');

  const cuisines = Object.entries(context.cuisine_distribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cuisine, count]) => `${cuisine} (${count})`)
    .join(', ');

  const displayName = `${context.name}${context.state ? `, ${context.state}` : ''}`;

  return `Research and write a 250-350 word overview of the TV chef restaurant scene in ${displayName}.

CITY CONTEXT:
Location: ${displayName}
Restaurant Count: ${context.restaurant_count} TV chef restaurants
Chef Count: ${context.chef_count} chefs
Show Winners: ${context.show_winner_count}
James Beard Winners: ${context.james_beard_winner_count}

Top Restaurants: ${topRestaurants}

Cuisine Types: ${cuisines}
Price Distribution: ${Object.entries(context.price_distribution).map(([p, c]) => `${p}: ${c}`).join(', ')}

TASK:
Write an engaging overview covering:
1. Why ${context.name} matters for TV chef dining (mention specific numbers and notable chefs)
2. Highlight 3-5 of the best restaurants BY NAME (from the list above)
3. The culinary diversity and prestige of the scene
4. What food tourists should know about dining here

Use web search to find articles about ${displayName}'s food scene, city guides, and restaurant reviews.
Mention specific restaurant names from the data provided above.`;
}
