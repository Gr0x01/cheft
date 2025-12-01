const MAX_SLUG_LENGTH = 200;

export class SlugValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SlugValidationError';
  }
}

function validateInput(text: string, fieldName: string): void {
  if (text === null || text === undefined) {
    throw new SlugValidationError(`${fieldName} cannot be null or undefined`);
  }
  if (typeof text !== 'string') {
    throw new SlugValidationError(`${fieldName} must be a string`);
  }
  if (text.trim() === '') {
    throw new SlugValidationError(`${fieldName} cannot be empty`);
  }
}

export function generateSlug(text: string): string {
  validateInput(text, 'text');
  
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();

  if (slug === '') {
    throw new SlugValidationError('Input produced empty slug after sanitization');
  }

  if (slug.length > MAX_SLUG_LENGTH) {
    return slug.substring(0, MAX_SLUG_LENGTH);
  }

  return slug;
}

export function generateChefSlug(chefName: string): string {
  validateInput(chefName, 'chefName');
  const cleanName = chefName.replace(/\s*\(\d+\)\s*$/, '').trim();
  return generateSlug(cleanName);
}

export function generateRestaurantSlug(
  restaurantName: string,
  city: string,
  chefSlug: string
): string {
  validateInput(restaurantName, 'restaurantName');
  validateInput(city, 'city');
  validateInput(chefSlug, 'chefSlug');
  return generateSlug(`${restaurantName}-${city}-${chefSlug}`);
}

export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false;
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length <= MAX_SLUG_LENGTH;
}
