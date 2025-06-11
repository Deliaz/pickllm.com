import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import Head from 'next/head';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'PickLLM - OpenAI Model Results Comparison Tool',
    template: '%s | PickLLM'
  },
  description: 'Compare responses from different OpenAI models side by side with PickLLM. Test GPT-4, GPT-3.5, and other models to find the best AI for your needs.',
  keywords: [
    'OpenAI',
    'GPT-4',
    'GPT comparison',
    'AI model comparison',
    'LLM comparison',
    'artificial intelligence',
    'machine learning',
    'language models',
    'PickLLM'
  ],
  authors: [{ name: 'Denis Leonov', url: 'https://x.com/d3liaz' }],
  creator: 'Denis Leonov',
  publisher: 'PickLLM',
  metadataBase: new URL('https://pickllm.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://pickllm.com',
    title: 'PickLLM - OpenAI Model Results Comparison Tool',
    description: 'Compare responses from different OpenAI models side by side with PickLLM. Test GPT-4, GPT-3.5, and other models to find the best AI for your needs.',
    siteName: 'PickLLM',
    images: [
      {
        url: '/openai-model-comparison-preview.png',
        width: 1200,
        height: 630,
        alt: 'PickLLM - OpenAI Model Comparison Tool Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PickLLM - OpenAI Model Results Comparison Tool',
    description: 'Compare responses from different OpenAI models side by side with PickLLM. Test GPT-4, GPT-3.5, and other models to find the best AI for your needs.',
    creator: '@d3liaz',
    images: ['/openai-model-comparison-preview.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%2210 0 100 100%22><text y=%22.90em%22 font-size=%2290%22>🤖</text></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
      <Script defer data-domain="pickllm.com" src="https://p.hostedapp.one/js/script.js"></Script>
    </html>
  );
}