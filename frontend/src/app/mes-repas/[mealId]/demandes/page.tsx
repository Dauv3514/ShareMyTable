import HostMealRequestsClient from "./HostMealRequestsClient";

type HostMealRequestsPageProps = {
  params: Promise<{
    mealId: string;
  }>;
};

export default async function HostMealRequestsPage({
  params,
}: HostMealRequestsPageProps) {
  const { mealId } = await params;

  return <HostMealRequestsClient mealId={mealId} />;
}