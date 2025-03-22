'use client';

import { Sidebar } from '@/components/admin/sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="fixed inset-y-0 z-50 flex w-72 flex-col">
        <Sidebar />
      </div>
      <div className="pl-72">
        <div className="min-h-screen">
          {children}
        </div>
      </div>
    </div>
  );
}
