interface ChefIndexingSignals {
  hasBio: boolean;
  hasNarrative: boolean;
  hasPublicRestaurant: boolean;
}

export function isChefWorthIndexing(signals: ChefIndexingSignals): boolean {
  return signals.hasBio
    || signals.hasNarrative
    || signals.hasPublicRestaurant;
}
