import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { getCurrentUserServer } from "@/lib/auth";
import AppLayout from "@/components/layout/app-layout";

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AuditDesk - Auditing System Portal",
  description: "Enterprise Auditing portal for timeline planning, findings tracking, and document management.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Retrieve the current user from session cookies on the server
  const currentUser = await getCurrentUserServer();

  return (
    <html lang="en" className="h-full antialiased dark">
      <body className={`${roboto.className} min-h-full flex flex-col`}>
        <AppLayout currentUser={currentUser}>
          {children}
        </AppLayout>
      </body>
    </html>
  );
}
