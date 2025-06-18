
import type {Metadata} from 'next';
import { Geist, Geist_Mono } from 'next/font/google'; // Assuming these are installed via next/font
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Ensure Toaster is imported

const geistSans = Geist({ // Corrected: Geist is a function call
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({ // Corrected: Geist_Mono is a function call
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Jarvis 1.01',
  description: 'AI-powered bioinformatics assistant',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full flex flex-col bg-background`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
