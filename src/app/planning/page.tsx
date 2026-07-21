import { dbService } from "@/lib/dbService";
import { getCurrentUserServer } from "@/lib/auth";
import PlanningClient from "./planning-client";

export default async function PlanningPage() {
  const currentUser = await getCurrentUserServer();
  const projects = await dbService.getProjects();
  const users = await dbService.getUsers(); // For selecting Lead Auditor
  const departments = await dbService.getDepartments(); // For selecting Departments

  return (
    <PlanningClient 
      initialProjects={projects} 
      users={users} 
      departments={departments}
      currentUser={currentUser} 
    />
  );
}
