import { notFound } from "next/navigation";
import { getEventDetailPayload } from "@/lib/meal-data";
import ReservationWizard from "../ReservationWizard";

type ReservationRecapPageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

export default async function ReservationRecapPage({
  params,
}: ReservationRecapPageProps) {
  const { eventId } = await params;
  const payload = await getEventDetailPayload(eventId);

  if (!payload) {
    notFound();
  }

  return (
    <ReservationWizard
      event={payload.event}
      hostProfile={payload.hostProfile}
      mode="recap"
    />
  );
}