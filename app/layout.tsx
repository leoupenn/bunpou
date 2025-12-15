import type { Metadata } from 'next'
import './globals.css'
import { UserProvider } from '@/contexts/UserContext'

export const metadata: Metadata = {
  title: 'Bunpou - Japanese Grammar Learning',
  description: 'Learn Japanese grammar with spaced repetition',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  )
}

