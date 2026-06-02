import { redirect } from "next/navigation";

export default function AdminRoute() {
  redirect("/login/petugas?role=humas-admin");
}
