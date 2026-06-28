import { useCallback, useEffect, useMemo, useState } from "react";
import { ensureDemoSeed } from "./seed";
import { localApi } from "./handlers";
import { subscribe } from "./store";

type Skip = "skip";

export function useLocalStoreSnapshot() {
  const [, bump] = useState(0);
  useEffect(() => {
    ensureDemoSeed();
    return subscribe(() => bump((n) => n + 1));
  }, []);
}

export function useLocalQuery<T>(
  handler: (...args: never[]) => T,
  args: Record<string, unknown> | Skip = {},
): T | undefined {
  useLocalStoreSnapshot();
  const argsKey = args === "skip" ? "skip" : JSON.stringify(args);
  return useMemo(() => {
    if (args === "skip") return undefined;
    try {
      return handler(args as never);
    } catch {
      return undefined;
    }
  }, [handler, argsKey]);
}

export function useLocalMutation<TArgs, TResult>(
  handler: (args: TArgs) => TResult,
): (args: TArgs) => Promise<TResult> {
  useLocalStoreSnapshot();
  return useCallback(async (args: TArgs) => handler(args), [handler]);
}

export function useLocalAction<TArgs, TResult>(
  handler: (args: TArgs) => TResult,
): (args: TArgs) => Promise<TResult> {
  return useLocalMutation(handler);
}

export const localBackend = {
  me: () => localApi.me(),
  postLoginDestination: () => localApi.postLoginDestination(),
  createOrganizationWithOwner: (args: { name: string }) =>
    localApi.createOrganizationWithOwner(args.name),
  updateOrganization: localApi.updateOrganization,
  dashboardCases: localApi.dashboardCases,
  caseDetail: localApi.caseDetail,
  updateCaseProfile: localApi.updateCaseProfile,
  createInvitation: localApi.createInvitation,
  invitationsForOrg: localApi.invitationsForOrg,
  invitationByToken: localApi.invitationByToken,
  acceptInvitation: localApi.acceptInvitation,
  assignTest: localApi.assignTest,
  studentTests: localApi.studentTests,
  resolveTestSession: localApi.resolveTestSession,
  startTest: localApi.startTest,
  upsertTestResponse: localApi.upsertTestResponse,
  seedCatalogs: () => localApi.seedCatalogs(),
};

export const localAi = {
  generateTest: localApi.generateTest,
  gradeTest: localApi.gradeTest,
  analyzeInterview: localApi.analyzeInterview,
  generateReport: localApi.generateReport,
};
