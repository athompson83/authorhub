import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'AuthorHub',
    template: '%s · AuthorHub',
  },
  description:
    'A source-grounded author operating system for writing, verifying, formatting, and preparing books for publication.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
