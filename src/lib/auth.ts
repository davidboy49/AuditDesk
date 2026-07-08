import { mockUsers, User } from "./mockData";

// Simple cookie-based authentication helper that works in server components
export async function getCurrentUserServer(): Promise<User> {
  // In Next.js App Router, we can read cookies on the server.
  // Since we might not have cookies imported or configured during static generation,
  // we will import cookies dynamically.
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const userId = cookieStore.get("auth_user_id")?.value;
    
    if (userId) {
      const user = mockUsers.find(u => u.id === userId);
      if (user) return user;
    }
  } catch (e) {
    // Fallback if cookies() is called outside a request context
  }
  
  // Default user is Sarah Lead (LEAD_AUDITOR) for a seamless testing experience
  return mockUsers[1]; 
}

// Role authorization rules
export const RBAC = {
  isAdmin(user: User): boolean {
    return user.role === "ADMIN";
  },
  canManageUsers(user: User): boolean {
    return user.role === "ADMIN" || user.role === "LEAD_AUDITOR";
  },
  canCreateProject(user: User): boolean {
    return user.role === "ADMIN" || user.role === "LEAD_AUDITOR";
  },
  canEditScope(user: User): boolean {
    return user.role === "ADMIN" || user.role === "LEAD_AUDITOR";
  },
  canWriteFinding(user: User): boolean {
    return user.role === "ADMIN" || user.role === "LEAD_AUDITOR" || user.role === "AUDITOR";
  },
  canUploadDocuments(user: User): boolean {
    return true; // Everyone can upload, but AUDITEE might be restricted to certain directories
  },
  canApproveReport(user: User): boolean {
    return user.role === "ADMIN" || user.role === "LEAD_AUDITOR";
  }
};
