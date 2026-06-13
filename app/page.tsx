import { MatchStudioPage } from './new/match-studio-page';

const faqStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    ['¿Qué es este simulador de Los Juegos del Hambre?', 'Es un simulador online en español donde eliges personajes, creas una partida y sigues una historia de supervivencia generada turno a turno hasta conocer al ganador.'],
    ['¿Cómo crear una simulación de Los Juegos del Hambre?', 'Selecciona una o más películas, elige al menos 10 personajes para el roster, ajusta la configuración de la arena e inicia la partida. El simulador se encarga de generar los eventos.'],
    ['¿Puedo elegir los personajes de la partida?', 'Sí. Puedes combinar personajes de distintas películas de Los Juegos del Hambre y decidir quiénes participan antes de comenzar la simulación.'],
    ['¿Qué ocurre durante una partida?', 'La arena avanza mediante eventos narrativos que pueden crear alianzas, rivalidades, heridas y eliminaciones. Puedes pausar la reproducción y seguir el estado de cada participante.'],
    ['¿El simulador guarda mis partidas?', 'Sí. Las partidas se guardan localmente en tu navegador para que puedas revisarlas desde el historial o continuar una simulación guardada.'],
    ['¿Es gratis y está disponible en español?', 'Sí. Este simulador de Los Juegos del Hambre es gratuito, funciona online y su interfaz está disponible en español.']
  ].map(([name, text]) => ({
    '@type': 'Question',
    name,
    acceptedAnswer: { '@type': 'Answer', text }
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
