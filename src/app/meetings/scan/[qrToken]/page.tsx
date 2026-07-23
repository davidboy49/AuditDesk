import { getOpenMeetingByQrAction } from "@/app/actions";
import ScanClient from "./scan-client";
import { notFound } from "next/navigation";

export const metadata = {
  title: "Open Meeting & Scope Consent | AuditDesk",
  description: "Departmental Open Meeting agenda and audit scope confirmation portal."
};

interface PageProps {
  params: Promise<{ qrToken: string }>;
}

export default async function ScanPage({ params }: PageProps) {
  const { qrToken } = await params;
  const { schedule, currentUser, departments } = await getOpenMeetingByQrAction(qrToken);

  if (!schedule) {
    notFound();
  }

  return (
    <ScanClient 
      schedule={schedule} 
      currentUser={currentUser} 
      departmentsList={departments} 
      qrToken={qrToken}
    />
  );
}
