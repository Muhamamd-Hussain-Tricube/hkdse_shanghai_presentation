import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

/**
 * Layout for /parent/$caseId/test/* — only bare /test (no assignment id) redirects to the tests hub.
 * Child route /test/$assignmentId must not run this redirect (was breaking all Start buttons).
 */
export const Route = createFileRoute("/parent/$caseId/test")({
  beforeLoad: async ({ location, params }) => {
    const base = `/parent/${params.caseId}/test`;
    if (location.pathname === base || location.pathname === `${base}/`) {
      throw redirect({ to: "/parent/$caseId/tests", params: { caseId: params.caseId } });
    }
  },
  component: () => <Outlet />,
});
