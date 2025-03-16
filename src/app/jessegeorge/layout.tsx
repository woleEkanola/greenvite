import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Greenvites | jessegeorge',
  description: 'Church dedication of Jesse Oghenekome George',
}

export default function EventLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white">
      {children}
    </div>
  )
}
