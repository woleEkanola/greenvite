'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';

// Metadata can't be exported from client components
// We'll set the title in the page component instead

export default function AccessMobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Access Check</title>
        <meta name="description" content="Mobile access code checker" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <SessionProvider>
          {children}
          <Toaster position="bottom-center" />
        </SessionProvider>
      </body>
    </html>
  );
}
