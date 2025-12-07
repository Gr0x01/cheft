'use client'

import { ReactNode, CSSProperties } from 'react'
import posthog from 'posthog-js'

interface ExternalLinkTrackerProps {
  href: string
  linkType: 'google_maps' | 'website' | 'instagram' | 'other'
  restaurantName?: string
  chefName?: string
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function ExternalLinkTracker({ 
  href, 
  linkType, 
  restaurantName, 
  chefName, 
  children, 
  className,
  style
}: ExternalLinkTrackerProps) {
  const handleClick = () => {
    posthog.capture('external_link_clicked', {
      link_type: linkType,
      url: href,
      restaurant_name: restaurantName,
      chef_name: chefName,
    })
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={style}
    >
      {children}
    </a>
  )
}
