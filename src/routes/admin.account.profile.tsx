import { createFileRoute } from "@tanstack/react-router";
import { AdminAccountPage } from "@/components/admin/AdminAccountPage";

export const Route = createFileRoute("/admin/account/profile")({
  component: () => <AdminAccountPage page="profile" />,
});
