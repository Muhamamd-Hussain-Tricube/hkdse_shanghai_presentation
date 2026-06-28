import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/parent/$caseId")({
  beforeLoad: async ({ location, params }) => {
    const base = `/parent/${params.caseId}`;
    if (location.pathname === base || location.pathname === `${base}/`) {
      throw redirect({ to: "/parent/$caseId/tests", params: { caseId: params.caseId } });
    }
  },
  component: () => <Outlet />,
});
