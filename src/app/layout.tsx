import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthSessionProvider from "@/components/providers/session-provider";
import { AppProvider } from "@/contexts/AppContext";
import { NotificationContainer } from "@/components/ui/Notifications";
import ErrorBoundary from "@/components/ErrorBoundary";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
export const metadata: Metadata = {
  title: "Sistema de Control de Calidad",
  description: "Sistema de gestión y control de calidad empresarial",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Control Calidad"
  },
  formatDetection: {
    telephone: false
  },
  openGraph: {
    type: "website",
    siteName: "Sistema de Control de Calidad",
    title: "Control de Calidad",
    description: "Sistema de gestión y control de calidad empresarial"
  },
  twitter: {
    card: "summary",
    title: "Control de Calidad",
    description: "Sistema de gestión y control de calidad empresarial"
  }
};
export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ErrorBoundary>
          <AppProvider>
            <AuthSessionProvider>
              {children}
              <NotificationContainer />
            </AuthSessionProvider>
          </AppProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
