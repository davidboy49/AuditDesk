import type { Metadata } from "next";
import "./globals.css";
import { getCurrentUserServer } from "@/lib/auth";
import AppLayout from "@/components/layout/app-layout";

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
      <body className="min-h-full flex flex-col font-sans">
        <AppLayout currentUser={currentUser}>
          {children}
        </AppLayout>
      </body>
    </html>
  );
}
