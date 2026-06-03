import { redirect } from 'next/navigation';

type NewMatchPageProps = {
  searchParams: Promise<{
    prefill?: string;
  }>;
};

export default async function NewMatchPage({ searchParams }: NewMatchPageProps) {
  const { prefill } = await searchParams;
  redirect(prefill ? `/?prefill=${encodeURIComponent(prefill)}` : '/');
}
