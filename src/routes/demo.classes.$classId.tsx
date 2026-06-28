import { createFileRoute } from "@tanstack/react-router";
import { ClassDetailPageInner } from "./dashboard.classes.$classId";

export const Route = createFileRoute("/demo/classes/$classId")({
  component: DemoClassDetailPage,
});

function DemoClassDetailPage() {
  const { classId } = Route.useParams();
  return (
    <ClassDetailPageInner
      orgId="local-demo"
      classId={classId}
      listPath="/demo/classes"
      standalone
    />
  );
}
