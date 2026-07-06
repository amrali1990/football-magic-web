import type { Metadata } from "next";
import { Merriweather } from "next/font/google";
import "./globals.css";
import StoreProvider from "@/store/provider";
import { ClientLayout } from "./client-layout";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationSchema, webSiteSchema } from "@/lib/schema";
import { SITE_URL, SITE_NAME, metaDescription } from "@/lib/seo";
import { getTopTeams, getTopLeagues } from "@/lib/server-api";
import type { SidebarSeedData } from "@/lib/layout-context";

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} – Live Football Scores, Fixtures, Teams & Player Stats`,
    template: `%s | ${SITE_NAME}`,
  },
  description: metaDescription(
    `Live football scores, fixtures, results, league standings, team squads and player statistics from leagues and cups worldwide on ${SITE_NAME}.`
  ),
  applicationName: SITE_NAME,
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    url: SITE_URL,
    locale: "en_US",
  },
  twitter: {
    card: "summary",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Top teams/leagues render in the right sidebar on every page; fetching them
  // here puts those internal links into the crawlable HTML site-wide (English —
  // the sidebar refetches client-side for Arabic users, as before).
  const [topTeams, topLeagues] = await Promise.all([getTopTeams('en'), getTopLeagues('en')]);
  const sidebarSeed = {
    teams: (topTeams as SidebarSeedData['teams']).slice(0, 8),
    leagues: (topLeagues as SidebarSeedData['leagues']).slice(0, 8),
  };

  return (
    <html lang="en" className={`${merriweather.variable} h-full antialiased`}>
      <body className="min-h-full bg-white font-sans">
        <JsonLd data={organizationSchema()} />
        <JsonLd data={webSiteSchema()} />
        <StoreProvider>
          <ClientLayout sidebarSeed={sidebarSeed}>{children}</ClientLayout>
        </StoreProvider>
      </body>
    </html>
  );
}
