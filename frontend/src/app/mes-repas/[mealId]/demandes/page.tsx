import { redirect } from "next/navigation";

type OldHostMealRequestsPageProps = {
  params: Promise<{
    mealId: string;
  }>;
};

export default async function OldHostMealRequestsPage({
  params,
}: OldHostMealRequestsPageProps) {
  const { mealId } = await params;

  redirect(`/mes-evenements/${mealId}/demandes`);
}