import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { localApi } from "./local-demo/handlers";
import { ensureDemoSeed } from "./local-demo/seed";
import { subscribe } from "./local-demo/store";

export type AppUser = {
  id: string;
  email?: string;
  name?: string;
};

export type OrgMembership = {
  id: string;
  organization_id: string;
  is_owner: boolean;
  organization: { id: string; name: string; slug: string; calendly_url: string | null };
};

type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  organizations: OrgMembership[];
  activeOrgId: string | null;
  setActiveOrgId: (id: string | null) => void;
  refreshOrganizations: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [storeTick, setStoreTick] = useState(0);
  useEffect(() => {
    ensureDemoSeed();
    return subscribe(() => setStoreTick((n) => n + 1));
  }, []);

  const me = useMemo(() => localApi.me(), [storeTick]);
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(null);

  const organizations = useMemo(
    () => ((me?.organizations ?? []) as OrgMembership[]) ?? [],
    [me?.organizations],
  );
  const user = me?.user
    ? ({ id: me.user.id, email: me.user.email, name: me.user.name } as AppUser)
    : null;
  const loading = false;

  const setActiveOrgId = (id: string | null) => {
    setActiveOrgIdState(id);
    if (id) localStorage.setItem("active_org_id", id);
    else localStorage.removeItem("active_org_id");
  };

  useEffect(() => {
    if (!user) {
      setActiveOrgIdState(null);
      return;
    }
    const stored = localStorage.getItem("active_org_id");
    if (stored && organizations.some((o) => o.organization_id === stored)) {
      setActiveOrgIdState(stored);
    } else if (organizations.length > 0) {
      setActiveOrgIdState(organizations[0].organization_id);
    } else {
      setActiveOrgIdState(null);
    }
  }, [user, organizations]);

  const signOut = async () => {
    localApi.signOut();
    localStorage.removeItem("active_org_id");
    setActiveOrgIdState(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: !!loading,
        organizations,
        activeOrgId,
        setActiveOrgId,
        refreshOrganizations: async () => {},
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useLocalAuthActions() {
  return {
    signIn: async (
      _provider: string,
      params: { flow: string; email: string; password: string; name?: string },
    ) => {
      if (params.flow === "signIn") {
        localApi.signIn(params.email, params.password);
      } else {
        localApi.signUp(params.email, params.password, params.name);
      }
    },
    signOut: async () => localApi.signOut(),
  };
}

/** @deprecated Use useLocalAuthActions */
export const useAuthActions = useLocalAuthActions;

export function useLocalAuthState() {
  const [storeTick, setStoreTick] = useState(0);
  useEffect(() => subscribe(() => setStoreTick((n) => n + 1)), []);
  const me = useMemo(() => localApi.me(), [storeTick]);
  return {
    isLoading: false,
    isAuthenticated: !!me?.user,
  };
}

/** @deprecated Use useLocalAuthState */
export const useConvexAuth = useLocalAuthState;
