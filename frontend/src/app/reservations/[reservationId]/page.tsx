import ReservationDetailClient from "./ReservationDetailClient";

type ReservationDetailPageProps = {
  params: Promise<{
    reservationId: string;
  }>;
};

export default async function ReservationDetailPage({
  params,
}: ReservationDetailPageProps) {
  const { reservationId } = await params;

  return <ReservationDetailClient reservationId={reservationId} />;
}