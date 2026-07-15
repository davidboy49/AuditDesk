import { dbService } from "@/lib/dbService";
import { getCurrentUserServer } from "@/lib/auth";
import MeetingsClient from "./meetings-client";

export default async function MeetingsPage() {
  const currentUser = await getCurrentUserServer();
  const projects = await dbService.getProjects();
  const schedules = await dbService.getExecutionSchedules();
  const users = await dbService.getUsers();

  return (
    <MeetingsClient
      initialSchedules={schedules}
      projects={projects}
      users={users}
      currentUser={currentUser}
    />
  );
}
