import type { Metadata } from 'next'
import { Playfair_Display, Cormorant_Garamond, Lato } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
})
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-cormorant',
})
const lato = Lato({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-lato',
})

export const metadata: Metadata = {
  title: 'SmartTable',
  description: 'Restaurant Service Management',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#000000',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${playfair.variable} ${cormorant.variable} ${lato.variable} antialiased`}>
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
