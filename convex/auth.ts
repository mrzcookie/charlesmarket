import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

const STARTING_BALANCE = 2000;

function handleFromEmail(email: string | undefined) {
	if (!email) return `@user-${Math.random().toString(36).slice(2, 8)}`;
	const local = email.split("@")[0] ?? "user";
	const safe = local.toLowerCase().replace(/[^a-z0-9._-]/g, "");
	return `@${safe || "user"}`;
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
	providers: [Google],
	callbacks: {
		async createOrUpdateUser(ctx, args) {
			if (args.existingUserId) {
				const existing = await ctx.db.get(args.existingUserId);
				if (existing) {
					await ctx.db.patch(args.existingUserId, {
						email: args.profile.email ?? existing.email,
						name: args.profile.name ?? existing.name,
						image: args.profile.image ?? existing.image,
					});
				}
				return args.existingUserId;
			}
			return await ctx.db.insert("users", {
				email: args.profile.email,
				name: args.profile.name,
				image: args.profile.image,
				emailVerificationTime: args.profile.emailVerified
					? Date.now()
					: undefined,
				handle: handleFromEmail(args.profile.email),
				balance: STARTING_BALANCE,
				joinedAt: Date.now(),
			});
		},
	},
});
