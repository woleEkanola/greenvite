'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface CancelInviteButtonProps {
  inviteId: string
  onSuccess?: () => void
  disabled?: boolean
}

export function CancelInviteButton({ inviteId, onSuccess, disabled = false }: CancelInviteButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this invite? This will make the registration code available again.')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/invites/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: inviteId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel invite')
      }

      toast({
        title: 'Invite Canceled',
        description: 'The invite has been canceled and the registration code is now available again.',
        variant: 'default',
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
      })

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('Error canceling invite:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to cancel invite',
        variant: 'destructive',
        icon: <AlertCircle className="h-4 w-4" />,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleCancel}
      disabled={disabled || isLoading}
      className="w-full"
    >
      {isLoading ? 'Canceling...' : 'Cancel Invite'}
    </Button>
  )
}
