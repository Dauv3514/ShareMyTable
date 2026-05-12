import { notFound } from "next/navigation";
import { getEventDetailPayload } from "@/lib/meal-data";
import ReservationWizard from "../ReservationWizard";

type ReservationPaymentPageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

export default async function ReservationPaymentPage({
  params,
}: ReservationPaymentPageProps) {
  const { eventId } = await params;
  const payload = await getEventDetailPayload(eventId);

  if (!payload) {
    notFound();
  }

  return (
    <ReservationWizard
      event={payload.event}
      hostProfile={payload.hostProfile}
      mode="payment"
    />
  );
}