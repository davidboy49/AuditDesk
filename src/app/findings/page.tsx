import { dbService } from "@/lib/dbService";
import { getCurrentUserServer } from "@/lib/auth";
import FindingsClient from "./findings-client";

export default async function FindingsPage() {
  const currentUser = await getCurrentUserServer();
  const findings = await dbService.getFindings();
  const projects = await dbService.getProjects();
  const users = await dbService.getUsers(); // For selecting auditor/owner

  return (
    <FindingsClient 
      initialFindings={findings} 
      projects={projects} 
      users={users} 
      currentUser={currentUser} 
    />
  );
}
