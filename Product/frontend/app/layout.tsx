import type { Metadata, Viewport } from 'next'
import { Nunito, Fredoka, Geist_Mono } from 'next/font/google'
import './globals.css'

const nunito = Nunito({ 
  subsets: ["latin"],
  variable: '--font-nunito',
  display: 'swap',
});

const fredoka = Fredoka({ 
  subsets: ["latin"],
  variable: '--font-fredoka',
  display: 'swap',
});

const _geistMono = Geist_Mono({ 
  subsets: ["latin"],
  variable: '--font-mono',
});

export const viewport: Viewport = {
  themeColor: '#f97316',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'MENTIS - Early Dyslexia Screening for Better Learning Outcomes',
  description: 'MENTIS provides early dyslexia screening through innovative eye-tracking and smart pen technology. Help your child unlock their full learning potential with research-backed assessments.',
  generator: 'MENTIS',
  keywords: ['dyslexia', 'screening', 'children', 'education', 'learning', 'assessment', 'eye tracking', 'smart pen'],
  // Absolute base for og:image — link previews (WhatsApp, LinkedIn, Canva) cannot
  // resolve a relative path, and without og tags they fall back to whatever icon
  // they happen to have cached.
  metadataBase: new URL('https://mentis-sih.netlify.app'),
  openGraph: {
    type: 'website',
    siteName: 'MENTIS',
    title: 'MENTIS — Dyslexia & dysgraphia screening from a webcam and a writing pad',
    description:
      'A child reads a passage while the webcam tracks their eyes, then writes while a stylus records every stroke. 23 signals, one explainable result. Screening aid, not a diagnosis.',
    url: 'https://mentis-sih.netlify.app',
    locale: 'en_IN',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'MENTIS — dyslexia and dysgraphia screening from a webcam and a writing pad',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MENTIS — Dyslexia & dysgraphia screening',
    description:
      'Eye movement and pen stroke measured together. 23 signals, one explainable result.',
    images: ['/opengraph-image.png'],
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
     <html lang="en" className={`${nunito.variable} ${fredoka.variable}`}>
       <body className="font-sans antialiased overflow-x-clip">
        <script src="https://accounts.google.com/gsi/client" async defer></script>
         {children}
       </body>
    </html>
  )
}
