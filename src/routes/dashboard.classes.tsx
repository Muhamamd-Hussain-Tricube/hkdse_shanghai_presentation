import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/classes")({
  component: () => <Outlet />,
});
