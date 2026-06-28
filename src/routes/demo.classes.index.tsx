import { createFileRoute } from "@tanstack/react-router";
import { ClassesPageInner } from "./dashboard.classes.index";

export const Route = createFileRoute("/demo/classes/")({
  component: DemoClassesIndexPage,
});

function DemoClassesIndexPage() {
  return <ClassesPageInner orgId="local-demo" standalone />;
}
