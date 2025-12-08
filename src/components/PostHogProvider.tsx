'use client'

import { Suspense, useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { initPostHog } from '@/lib/posthog'
import posthog from 'posthog-js'

if (typeof window !== 'undefined') {
  initPostHog()
}

function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    setInitialized(true)
  }, [])

  useEffect(() => {
    if (!initialized || !pathname) return

    const isAdminRoute = pathname.startsWith('/admin')
    
    if (isAdminRoute && posthog.sessionRecording) {
      posthog.stopSessionRecording()
    }

    let url = window.origin + pathname
    if (searchParams && searchParams.toString()) {
      url = url + `?${searchParams.toString()}`
    }
    posthog.capture('$pageview', {
      $current_url: url,
    })
  }, [pathname, searchParams, initialized])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </>
  )
}
