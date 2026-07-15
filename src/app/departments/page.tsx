import { dbService } from "@/lib/dbService";
import { getCurrentUserServer } from "@/lib/auth";
import DepartmentsClient from "./departments-client";

export default async function DepartmentsPage() {
  const currentUser = await getCurrentUserServer();
  const users = await dbService.getUsers();
  const departments = await dbService.getDepartments();
  const userGroups = await dbService.getUserGroups();

  return (
    <DepartmentsClient 
      initialUsers={users} 
      initialDepartments={departments} 
      initialUserGroups={userGroups} 
      currentUser={currentUser} 
    />
  );
}
