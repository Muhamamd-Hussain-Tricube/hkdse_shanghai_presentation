import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/demo/classes")({
  component: DemoClassesLayout,
});

function DemoClassesLayout() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </div>
    </div>
  );
}
