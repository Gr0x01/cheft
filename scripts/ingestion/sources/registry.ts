import { readFileSync } from 'fs';
import { join } from 'path';
import { ShowConfig, ShowsConfig, validateShowsConfig } from '../utils/validation';

const CONFIG_PATH = join(__dirname, '../config/shows.json');

export function loadShowsConfig(): ShowsConfig {
  const raw = readFileSync(CONFIG_PATH, 'utf-8');
  const parsed = JSON.parse(raw);
  return validateShowsConfig(parsed);
}

export function getEnabledShows(): ShowConfig[] {
  const config = loadShowsConfig();
  return config.shows
    .filter(show => show.enabled)
    .sort((a, b) => a.priority - b.priority);
}

export function getShowBySlug(slug: string): ShowConfig | undefined {
  const config = loadShowsConfig();
  return config.shows.find(show => show.slug === slug);
}

export function getAllShows(): ShowConfig[] {
  const config = loadShowsConfig();
  return config.shows.sort((a, b) => a.priority - b.priority);
}

export function getWikipediaUrl(show: ShowConfig): string {
  return `https://en.wikipedia.org/wiki/${show.wikipedia_source}`;
}
