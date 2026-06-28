export type LoginDestination =
  | { kind: "dashboard" }
  | { kind: "student"; caseId: string }
  | { kind: "none" }
  | null;

/** Full navigation so auth state is read from localStorage on the next page. */
export function redirectAfterLogin(destination: LoginDestination) {
  if (destination?.kind === "student") {
    window.location.assign(`/parent/${destination.caseId}/tests`);
    return;
  }
  if (destination?.kind === "dashboard") {
    window.location.assign("/dashboard/classes");
    return;
  }
  throw new Error("No workspace or case found for your account.");
}
