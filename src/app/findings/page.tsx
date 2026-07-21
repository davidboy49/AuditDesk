import { dbService } from "@/lib/dbService";
import { getCurrentUserServer } from "@/lib/auth";
import FindingsClient from "./findings-client";

export default async function FindingsPage() {
  const currentUser = await getCurrentUserServer();
  const projects = await dbService.getProjects();
  const schedules = await dbService.getExecutionSchedules();
  const users = await dbService.getUsers();
  const departments = await dbService.getDepartments();

  return (
    <FindingsClient
      initialSchedules={schedules}
      projects={projects}
      users={users}
      departments={departments}
      currentUser={currentUser}
    />
  );
}
