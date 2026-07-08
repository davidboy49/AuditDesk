import { dbService } from "@/lib/dbService";
import { getCurrentUserServer } from "@/lib/auth";
import ScheduleClient from "./schedule-client";

export default async function SchedulePage() {
  const currentUser = await getCurrentUserServer();
  const projects = await dbService.getProjects();
  const schedules = await dbService.getExecutionSchedules();
  const users = await dbService.getUsers();

  return (
    <ScheduleClient
      initialSchedules={schedules}
      projects={projects}
      users={users}
      currentUser={currentUser}
    />
  );
}
