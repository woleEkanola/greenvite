import dynamic from 'next/dynamic'

const InteractiveEventPage = dynamic(
  () => import('./components/InteractiveEventPage'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-gray-600">Loading invitation...</div>
      </div>
    )
  }
)

export default function Page() {
  return <InteractiveEventPage />
}
