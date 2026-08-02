const GA_MEASUREMENT_ID = 'G-X1GKSMV9NX'

/**
 * Plain script tags rather than next/script: under Next 16 the latter reads
 * HeadManagerContext during render, which crashed static prerendering from the root
 * layout ("Cannot read properties of null (reading 'useContext')"). These are
 * server-rendered into the HTML and load gtag exactly the same way.
 */
export function GoogleAnalytics() {
  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `,
        }}
      />
    </>
  )
}
