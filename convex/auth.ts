import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const email = String(params.email ?? "")
          .trim()
          .toLowerCase();
        const name = String(params.name ?? params.fullName ?? email).trim();
        if (!email) throw new Error("Email is required");
        return { email, name: name || email };
      },
    }),
  ],
});
