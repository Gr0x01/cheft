import posthog from 'posthog-js'

let initialized = false

export function initPostHog() {
  if (typeof window === 'undefined') return posthog
  if (initialized) return posthog

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

  if (apiKey) {
    initialized = true
    posthog.init(apiKey, {
      api_host: apiHost,
      defaults: '2025-11-30',
      person_profiles: 'always',
      capture_pageview: false,
      capture_pageleave: true,
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: false,
        maskInputOptions: {
          password: true,
        },
      },
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('PostHog loaded:', ph.get_distinct_id())
        }
      },
    })
  }

  return posthog
}
