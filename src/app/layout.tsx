import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const DESCRIPTION =
  "Find climate policies, read the evidence behind them and compare what worked elsewhere. Every claim cites a record; correlation is labelled correlation.";

export const metadata: Metadata = {
  metadataBase: new URL("https://pact-ox.vercel.app"),
  title: "PACT | Climate policy intelligence",
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "PACT",
    title: "PACT | What has actually worked in climate policy?",
    description: DESCRIPTION,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "PACT: What has actually worked?" }],
  },
  twitter: { card: "summary_large_image", title: "PACT | What has actually worked in climate policy?", description: DESCRIPTION, images: ["/og.png"] },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
