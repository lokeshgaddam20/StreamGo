import { Inter } from "next/font/google";
import "./globals.css";
import SessionProviderAuth from "./components/sessionProviderAuth";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "StreamGO - Educational Video Streaming",
  description: "Your ultimate platform for educational content streaming",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider defaultTheme="dark" storageKey="streamgo-theme">
          <SessionProviderAuth>
            {children}
          </SessionProviderAuth>
        </ThemeProvider>
      </body>
    </html>
  );
}