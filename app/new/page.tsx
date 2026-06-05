import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

type NewMatchPageProps = {
  searchParams: Promise<{
    prefill?: string;
  }>;
};

export const metadata: Metadata = {
  title: 'Nueva partida',
  robots: {
    index: false,
    follow: true
  }
};

export default async function NewMatchPage({ searchParams }: NewMatchPageProps) {
  const { prefill } = await searchParams;
  redirect(prefill ? `/?prefill=${encodeURIComponent(prefill)}` : '/');
}
