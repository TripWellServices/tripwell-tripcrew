import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TripWell - Trip Crew',
  description: 'Plan and organize your trips with your crew',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">{children}</body>
    </html>
  )
}

