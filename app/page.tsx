import { MatchStudioPage } from './new/match-studio-page';
import { HOME_FAQ } from '@/lib/home-faq';

const faqStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: HOME_FAQ.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer }
  }))
};

type HomeProps = {
  searchParams: Promise<{
    prefill?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const { prefill = null } = await searchParams;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      <MatchStudioPage prefillMatchId={prefill} />
    </>
  );
}
