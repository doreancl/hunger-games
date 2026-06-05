import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { AgentationDevtools } from '@/app/components/agentation-devtools';
import { ThemeFooter, ThemeHeader } from '@/app/components/theme-header';
import { DEFAULT_LOBBY_THEME } from '@/lib/lobby-theme';
import './theme.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hunger-games.sebecode.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Juegos del Hambre Simulador online',
    template: '%s | Simulador Juegos del Hambre'
  },
  description:
    'Juegos del Hambre Simulador online: crea partidas de supervivencia, selecciona personajes, ajusta eventos y mira la arena turno a turno.',
  keywords: [
    'simulador juegos del hambre',
    'los juegos del hambre simulador',
    'simulador de los juegos del hambre',
    'hunger games simulator',
    'simulador hunger games',
    'juegos del hambre online'
  ],
  alternates: {
    canonical: '/'
  },
  openGraph: {
    title: 'Juegos del Hambre Simulador online',
    description:
      'Crea partidas de Los Juegos del Hambre con personajes, eventos y narracion turno a turno.',
    url: '/',
    siteName: 'Simulador Juegos del Hambre',
    locale: 'es_CL',
    type: 'website'
  },
  twitter: {
    card: 'summary',
    title: 'Juegos del Hambre Simulador online',
    description:
      'Simula partidas de Los Juegos del Hambre con personajes, eventos y narracion turno a turno.'
  },
  robots: {
    index: true,
    follow: true
  }
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  const cloudflareAnalyticsToken =
    process.env.NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN;
  const googleAnalyticsId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={inter.variable}
      data-lobby-theme={DEFAULT_LOBBY_THEME}
      style={{ backgroundColor: '#0c0e14', colorScheme: 'dark' }}
    >
      <body style={{ backgroundColor: '#0c0e14' }}>
        <Script id="init-lobby-theme" strategy="beforeInteractive">
          {`(function(){try{const key='hg_lobby_theme';const raw=localStorage.getItem(key);const fallback='eng-runbook';const valid=['neon-future','retro-pixel','apple-bubbles','graphite-sport','forest-editorial','eng-runbook'];const themeValue=valid.includes(raw)?raw:fallback;document.documentElement.setAttribute('data-lobby-theme',themeValue);}catch(_e){document.documentElement.setAttribute('data-lobby-theme','eng-runbook');}})();`}
        </Script>
        <ThemeHeader />
        {children}
        <ThemeFooter />
        <AgentationDevtools />
        <Analytics />
        {googleAnalyticsId ? (
          <>
            <Script
              id="ga4-script"
              src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){window.dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('js', new Date());
                gtag('config', '${googleAnalyticsId}', { send_page_view: true });
              `}
            </Script>
          </>
        ) : null}
        {cloudflareAnalyticsToken ? (
          <Script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: cloudflareAnalyticsToken })}
            strategy="afterInteractive"
          />
        ) : null}
      </body>
    </html>
  );
}
