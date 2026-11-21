import { createFileRoute } from "@tanstack/react-router";

import { AdminLoginScreen } from "./admin";

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginScreen,
});
