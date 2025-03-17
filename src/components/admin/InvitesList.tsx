'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCcw, Send } from 'lucide-react'
import { CancelInviteButton } from './CancelInviteButton'
import { formatDistanceToNow } from 'date-fns'

interface Invite {
  id: string
  name: string
  email: string | null
  phone: string | null
  type: string
  status: string
  emailStatus?: string | null
  smsStatus?: string | null
  code?: string
  sent: boolean
  sentAt: string
  createdAt: string
}

export function InvitesList({ filterStatus }: { filterStatus?: string }) {
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInvites = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/invites')
      if (!response.ok) {
        throw new Error('Failed to fetch invites')
      }
      const data = await response.json()
      setInvites(data.invites || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching invites:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvites()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500">Sent</Badge>
      case 'partial':
        return <Badge className="bg-yellow-500">Partial</Badge>
      case 'pending':
        return <Badge className="bg-blue-500">Pending</Badge>
      case 'failed':
        return <Badge className="bg-red-500">Failed</Badge>
      case 'canceled':
        return <Badge className="bg-gray-500">Canceled</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const canCancel = (invite: Invite) => {
    return ['failed', 'pending', 'partial'].includes(invite.status)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Invites</CardTitle>
        <Button variant="outline" size="sm" onClick={fetchInvites} disabled={loading}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">Loading invites...</div>
        ) : error ? (
          <div className="text-center text-red-500 py-4">{error}</div>
        ) : invites.length === 0 ? (
          <div className="text-center py-4">No invites found</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.filter((invite) => filterStatus === undefined || invite.status === filterStatus).map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="font-medium">{invite.name}</TableCell>
                    <TableCell>
                      {invite.email && <div className="text-sm">{invite.email}</div>}
                      {invite.phone && <div className="text-sm">{invite.phone}</div>}
                    </TableCell>
                    <TableCell>{invite.code || 'N/A'}</TableCell>
                    <TableCell>{getStatusBadge(invite.status)}</TableCell>
                    <TableCell>
                      {invite.sent
                        ? formatDistanceToNow(new Date(invite.sentAt), { addSuffix: true })
                        : 'Not sent'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            // Implement resend functionality
                            window.location.href = `/admin/dashboard/invites/resend?id=${invite.id}`
                          }}
                        >
                          <Send className="h-3 w-3 mr-2" />
                          Resend
                        </Button>
                        
                        {canCancel(invite) && (
                          <CancelInviteButton 
                            inviteId={invite.id} 
                            onSuccess={fetchInvites}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
