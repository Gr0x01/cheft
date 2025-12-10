interface PersonSchemaProps {
  name: string;
  description?: string | null;
  image?: string | null;
  jobTitle?: string;
  awards?: string[];
  worksFor?: Array<{
    name: string;
    url: string;
  }>;
  sameAs?: string[];
  url: string;
  dateModified?: string;
}

export function PersonSchema({
  name,
  description,
  image,
  jobTitle = 'Chef',
  awards = [],
  worksFor = [],
  sameAs = [],
  url,
  dateModified,
}: PersonSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    jobTitle,
    url,
    ...(description && { description }),
    ...(image && { image }),
    ...(awards.length > 0 && { award: awards }),
    ...(worksFor.length > 0 && {
      worksFor: worksFor.map(place => ({
        '@type': 'Restaurant',
        name: place.name,
        url: place.url,
      })),
    }),
    ...(sameAs.length > 0 && { sameAs }),
    ...(dateModified && { dateModified }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface RestaurantSchemaProps {
  name: string;
  description?: string | null;
  image?: string[];
  url: string;
  telephone?: string | null;
  priceRange?: string | null;
  servesCuisine?: string[];
  address: {
    streetAddress?: string | null;
    addressLocality: string;
    addressRegion?: string | null;
    postalCode?: string | null;
    addressCountry: string;
  };
  geo?: {
    latitude: number;
    longitude: number;
  } | null;
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  } | null;
  founder?: {
    name: string;
    url: string;
  };
  dateModified?: string;
  michelinStars?: number | null;
}

export function RestaurantSchema({
  name,
  description,
  image = [],
  url,
  telephone,
  priceRange,
  servesCuisine = [],
  address,
  geo,
  aggregateRating,
  founder,
  dateModified,
  michelinStars,
}: RestaurantSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name,
    url,
    ...(description && { description }),
    ...(image.length > 0 && { image }),
    ...(telephone && { telephone }),
    ...(priceRange && { priceRange }),
    ...(servesCuisine.length > 0 && { servesCuisine }),
    address: {
      '@type': 'PostalAddress',
      addressLocality: address.addressLocality,
      addressCountry: address.addressCountry,
      ...(address.streetAddress && { streetAddress: address.streetAddress }),
      ...(address.addressRegion && { addressRegion: address.addressRegion }),
      ...(address.postalCode && { postalCode: address.postalCode }),
    },
    ...(geo && {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: geo.latitude,
        longitude: geo.longitude,
      },
    }),
    ...(aggregateRating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: aggregateRating.ratingValue.toString(),
        reviewCount: aggregateRating.reviewCount.toString(),
      },
    }),
    ...(founder && {
      founder: {
        '@type': 'Person',
        name: founder.name,
        url: founder.url,
      },
    }),
    ...(dateModified && { dateModified }),
    ...(michelinStars && michelinStars > 0 && {
      award: `${michelinStars} Michelin Star${michelinStars > 1 ? 's' : ''}`,
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface ItemListSchemaProps {
  name: string;
  description?: string;
  url: string;
  items: Array<{
    name: string;
    url: string;
    position: number;
  }>;
}

export function ItemListSchema({
  name,
  description,
  url,
  items,
}: ItemListSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    url,
    ...(description && { description }),
    numberOfItems: items.length,
    itemListElement: items.map(item => ({
      '@type': 'ListItem',
      position: item.position,
      name: item.name,
      url: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface BreadcrumbSchemaProps {
  items: Array<{
    name: string;
    url: string;
  }>;
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface WebSiteSchemaProps {
  name: string;
  url: string;
  description?: string;
  searchUrl?: string;
}

export function WebSiteSchema({
  name,
  url,
  description,
  searchUrl,
}: WebSiteSchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
    ...(description && { description }),
    ...(searchUrl && {
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: searchUrl,
        },
        'query-input': 'required name=search_term_string',
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
