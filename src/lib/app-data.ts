import { localApi } from "./local-demo/handlers";
import { useLocalMutation, useLocalQuery, useLocalAction } from "./local-demo/hooks";

/** Local-only data layer — replaces Convex hooks. */
export function useQuery<T>(
  ref: { name: string; handler: (...args: never[]) => T },
  args: Record<string, unknown> | "skip" = {},
) {
  return useLocalQuery(ref.handler, args === "skip" ? "skip" : args);
}

export function useMutation<TArgs, TResult>(ref: {
  name: string;
  handler: (args: TArgs) => TResult;
}) {
  return useLocalMutation(ref.handler);
}

export function useAction<TArgs, TResult>(ref: {
  name: string;
  handler: (args: TArgs) => TResult;
}) {
  return useLocalAction(ref.handler);
}

export const api = {
  backend: {
    me: { name: "me", handler: () => localApi.me() },
    postLoginDestination: {
      name: "postLoginDestination",
      handler: () => localApi.postLoginDestination(),
    },
    createOrganizationWithOwner: {
      name: "createOrganizationWithOwner",
      handler: (args: { name: string }) => localApi.createOrganizationWithOwner(args.name),
    },
    updateOrganization: {
      name: "updateOrganization",
      handler: localApi.updateOrganization,
    },
    dashboardCases: {
      name: "dashboardCases",
      handler: localApi.dashboardCases,
    },
    caseDetail: { name: "caseDetail", handler: localApi.caseDetail },
    updateCaseProfile: {
      name: "updateCaseProfile",
      handler: localApi.updateCaseProfile,
    },
    createInvitation: {
      name: "createInvitation",
      handler: localApi.createInvitation,
    },
    invitationsForOrg: {
      name: "invitationsForOrg",
      handler: localApi.invitationsForOrg,
    },
    invitationByToken: {
      name: "invitationByToken",
      handler: localApi.invitationByToken,
    },
    acceptInvitation: {
      name: "acceptInvitation",
      handler: localApi.acceptInvitation,
    },
    assignTest: { name: "assignTest", handler: localApi.assignTest },
    studentTests: { name: "studentTests", handler: localApi.studentTests },
    resolveTestSession: {
      name: "resolveTestSession",
      handler: localApi.resolveTestSession,
    },
    startTest: { name: "startTest", handler: localApi.startTest },
    upsertTestResponse: {
      name: "upsertTestResponse",
      handler: localApi.upsertTestResponse,
    },
    seedCatalogs: {
      name: "seedCatalogs",
      handler: () => localApi.seedCatalogs(),
    },
    saveTranscript: {
      name: "saveTranscript",
      handler: localApi.saveTranscript,
    },
    publishReport: {
      name: "publishReport",
      handler: localApi.publishReport,
    },
    unpublishReport: {
      name: "unpublishReport",
      handler: localApi.unpublishReport,
    },
  },
  ai: {
    generateTest: { name: "generateTest", handler: localApi.generateTest },
    gradeTest: { name: "gradeTest", handler: localApi.gradeTest },
    analyzeInterview: {
      name: "analyzeInterview",
      handler: localApi.analyzeInterview,
    },
    generateReport: { name: "generateReport", handler: localApi.generateReport },
  },
};
