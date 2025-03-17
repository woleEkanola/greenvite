'use client'

import { useEffect } from 'react'
import { InvitesList } from '@/components/admin/InvitesList'
import { DashboardShell } from '@/components/admin/DashboardShell'
import { DashboardHeader } from '@/components/admin/DashboardHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function ManageInvitesPage() {
  useEffect(() => {
    document.title = 'Manage Invites | Greenvites Admin'
  }, [])

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Manage Invites"
        text="View, cancel, and resend invitations."
      />

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Invites</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="space-y-4">
          <InvitesList />
        </TabsContent>
        <TabsContent value="failed" className="space-y-4">
          <InvitesList filterStatus="failed" />
        </TabsContent>
        <TabsContent value="pending" className="space-y-4">
          <InvitesList filterStatus="pending" />
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}
