import type { Metadata } from "next";
import { Merriweather } from "next/font/google";
import "./globals.css";
import StoreProvider from "@/store/provider";
import { ClientLayout } from "./client-layout";

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Football Magic",
  description: "Football matches, leagues, teams, and player statistics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${merriweather.variable} h-full antialiased`}>
      <body className="min-h-full bg-white font-sans">
        <StoreProvider>
          <ClientLayout>{children}</ClientLayout>
        </StoreProvider>
      </body>
    </html>
  );
}
