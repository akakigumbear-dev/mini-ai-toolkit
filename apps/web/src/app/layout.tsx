import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mini AI Toolkit',
  description: 'Generate AI content with text and image prompts',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>
          <div className="min-h-screen">
            <header className="border-b">
              <div className="container mx-auto flex h-14 items-center px-4">
                <nav className="flex items-center gap-6">
                  <a href="/" className="text-lg font-semibold">
                    Mini AI Toolkit
                  </a>
                  <a
                    href="/"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Dashboard
                  </a>
                  <a
                    href="/history"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    History
                  </a>
                </nav>
              </div>
            </header>
            <main className="container mx-auto px-4 py-6">{children}</main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
