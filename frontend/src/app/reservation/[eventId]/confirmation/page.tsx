import { notFound } from "next/navigation";
import { getEventDetailPayload } from "@/lib/meal-data";
import ReservationWizard from "../ReservationWizard";

type ReservationConfirmationPageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

export default async function ReservationConfirmationPage({
  params,
}: ReservationConfirmationPageProps) {
  const { eventId } = await params;
  const payload = await getEventDetailPayload(eventId);

  if (!payload) {
    notFound();
  }

  return (
    <ReservationWizard
      event={payload.event}
      hostProfile={payload.hostProfile}
      mode="confirmation"
    />
  );
}