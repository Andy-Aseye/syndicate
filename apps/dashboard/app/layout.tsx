import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: 'Atlas — the agency, in a box',
  description:
    'The operations layer for the AI-native agency. Atlas orchestrates 6 specialized agents on Gemini Enterprise Agent Platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className="bg-bg text-white min-h-screen font-sans antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
