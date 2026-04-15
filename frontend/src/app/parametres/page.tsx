import { redirect } from "next/navigation";

export default function ParametresPage() {
  redirect("/profil?panel=password");
}