import { dbService } from "@/lib/dbService";
import { getCurrentUserServer } from "@/lib/auth";
import UsersClient from "./users-client";

export default async function UsersPage() {
  const currentUser = await getCurrentUserServer();
  const users = await dbService.getUsers();
  const departments = await dbService.getDepartments();
  const userGroups = await dbService.getUserGroups();

  return (
    <UsersClient 
      initialUsers={users} 
      initialDepartments={departments} 
      initialUserGroups={userGroups} 
      currentUser={currentUser} 
    />
  );
}
