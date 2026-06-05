import type { Metadata } from 'next';
import { MatchesHistoryPage } from './matches-history-page';

export const metadata: Metadata = {
  title: 'Historial de partidas',
  description:
    'Revisa el historial local de partidas del simulador Juegos del Hambre y continua sesiones guardadas.',
  alternates: {
    canonical: '/sessions'
  }
};

export default function SessionsPage() {
  return <MatchesHistoryPage />;
}
