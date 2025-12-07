'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'

interface ChefViewProps {
  chefName: string
  chefSlug: string
  restaurantCount: number
  jamesBeardStatus: string | null
  hasMichelinStars: boolean
}

export function ChefPageView({ chefName, chefSlug, restaurantCount, jamesBeardStatus, hasMichelinStars }: ChefViewProps) {
  useEffect(() => {
    posthog.capture('chef_viewed', {
      chef_name: chefName,
      chef_slug: chefSlug,
      restaurant_count: restaurantCount,
      james_beard_status: jamesBeardStatus,
      has_michelin_stars: hasMichelinStars,
    })
  }, [chefName, chefSlug, restaurantCount, jamesBeardStatus, hasMichelinStars])

  return null
}

interface RestaurantViewProps {
  restaurantName: string
  restaurantSlug: string
  chefName: string | null
  city: string
  state: string | null
  priceTier: string | null
  michelinStars: number | null
  status: string
}

export function RestaurantPageView({ 
  restaurantName, 
  restaurantSlug, 
  chefName, 
  city, 
  state, 
  priceTier, 
  michelinStars, 
  status 
}: RestaurantViewProps) {
  useEffect(() => {
    posthog.capture('restaurant_viewed', {
      restaurant_name: restaurantName,
      restaurant_slug: restaurantSlug,
      chef_name: chefName,
      city,
      state,
      price_tier: priceTier,
      michelin_stars: michelinStars,
      status,
    })
  }, [restaurantName, restaurantSlug, chefName, city, state, priceTier, michelinStars, status])

  return null
}
