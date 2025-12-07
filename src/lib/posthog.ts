import posthog from 'posthog-js'

export function initPostHog() {
  if (typeof window !== 'undefined') {
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

    if (apiKey && !posthog.__loaded) {
      posthog.init(apiKey, {
        api_host: apiHost,
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
        loaded: (posthog) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('PostHog loaded:', posthog.get_distinct_id())
          }
        },
      })
    }
  }

  return posthog
}
