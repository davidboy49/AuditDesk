import { dbService } from "@/lib/dbService";
import { getCurrentUserServer } from "@/lib/auth";
import { redirect } from "next/navigation";
import LogsClient from "./logs-client";

export default async function LogsPage() {
  const currentUser = await getCurrentUserServer();
  
  // Restrict page access to ADMIN only
  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const logs = await dbService.getActivityLogs();

  return (
    <LogsClient
      initialLogs={logs}
      currentUser={currentUser}
    />
  );
}
