import type { Metadata, Viewport } from 'next'
import { Poppins, PT_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins'
})

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-pt-sans'
})

export const metadata: Metadata = {
  title: 'Neocharge - Tienda de Electronica',
  description: 'Neocharge - Tu tienda de electronica de confianza en La Habana. Productos de calidad, servicio profesional y atencion 24 horas.',
  keywords: ['electronica', 'tienda', 'cuba', 'habana', 'neocharge'],
  authors: [{ name: 'Neocharge' }],
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${poppins.variable} ${ptSans.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/images/logo-192.png" />
      </head>
      <body className="font-pt-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light">
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
