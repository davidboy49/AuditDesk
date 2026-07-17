import { getCurrentUserServer } from "@/lib/auth";
import { dbService } from "@/lib/dbService";
import { redirect } from "next/navigation";
import SettingsClient from "./settings-client";

export default async function SettingsPage() {
  const currentUser = await getCurrentUserServer();

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const smtpConfig = await dbService.getSmtpConfig();
  const templates = await dbService.getEmailTemplates();

  return (
    <SettingsClient
      currentUser={currentUser}
      initialSmtpConfig={smtpConfig}
      initialTemplates={templates}
    />
  );
}
