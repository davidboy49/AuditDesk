import { dbService } from "@/lib/dbService";
import { getCurrentUserServer } from "@/lib/auth";
import ScheduleClient from "./schedule-client";

export default async function SchedulePage() {
  const currentUser = await getCurrentUserServer();
  const projects = await dbService.getProjects();
  const schedules = await dbService.getExecutionSchedules();
  const releasedOpenMeetings = (await dbService.getOpenMeetings()).filter(meeting => meeting.status === "RELEASED");
  const users = await dbService.getUsers();
  const departments = await dbService.getDepartments();

  return (
    <ScheduleClient
      initialSchedules={schedules}
      releasedOpenMeetings={releasedOpenMeetings}
      projects={projects}
      users={users}
      departments={departments}
      currentUser={currentUser}
    />
  );
}
