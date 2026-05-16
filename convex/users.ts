import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";

export async function requireUser(ctx: QueryCtx): Promise<Doc<"users">> {
	const userId = await getAuthUserId(ctx);
	if (!userId) throw new Error("Not signed in");
	const user = await ctx.db.get(userId);
	if (!user) throw new Error("User record missing");
	return user;
}

export async function currentUser(ctx: QueryCtx): Promise<Doc<"users"> | null> {
	const userId = await getAuthUserId(ctx);
	if (!userId) return null;
	return await ctx.db.get(userId);
}

export function isAdminUser(user: Doc<"users"> | null | undefined): boolean {
	return Boolean(user?.isAdmin);
}

export async function requireAdmin(ctx: QueryCtx): Promise<Doc<"users">> {
	const user = await requireUser(ctx);
	if (!isAdminUser(user)) throw new Error("Admin only");
	return user;
}

export const me = query({
	args: {},
	handler: async (ctx) => {
		const user = await currentUser(ctx);
		if (!user) return null;
		return {
			_id: user._id,
			email: user.email,
			name: user.name,
			image: user.image,
			handle: user.handle ?? "@anon",
			balance: user.balance ?? 0,
			joinedAt: user.joinedAt,
			isAdmin: isAdminUser(user),
		};
	},
});

export const amIAdmin = query({
	args: {},
	handler: async (ctx) => {
		const user = await currentUser(ctx);
		return isAdminUser(user);
	},
});

export const updateHandle = mutation({
	args: { handle: v.string() },
	handler: async (ctx, { handle }) => {
		const user = await requireUser(ctx);
		const trimmed = handle.trim();
		if (!trimmed) throw new Error("Handle cannot be empty");
		const normalized = trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
		await ctx.db.patch(user._id, { handle: normalized });
		return normalized;
	},
});
