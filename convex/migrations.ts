import { mutation } from "./_generated/server";
import { requireAdmin } from "./users";

// One-shot cleanup: strips the legacy `resolutionSource` field from every
// markets and marketProposals row by rewriting the doc without it.
//
// Run with: npx convex run migrations:stripResolutionSource
// Once this returns { markets: N, proposals: N } and you're sure there's
// nothing left, remove `resolutionSource: v.optional(v.string())` from
// both tables in convex/schema.ts.
export const stripResolutionSource = mutation({
	args: {},
	handler: async (ctx) => {
		await requireAdmin(ctx);
		let marketsTouched = 0;
		let proposalsTouched = 0;

		const markets = await ctx.db.query("markets").collect();
		for (const m of markets) {
			if (Object.hasOwn(m, "resolutionSource")) {
				const { _id, _creationTime, resolutionSource: _drop, ...rest } = m;
				void _id;
				void _creationTime;
				void _drop;
				await ctx.db.replace(m._id, rest);
				marketsTouched += 1;
			}
		}

		const proposals = await ctx.db.query("marketProposals").collect();
		for (const p of proposals) {
			if (Object.hasOwn(p, "resolutionSource")) {
				const { _id, _creationTime, resolutionSource: _drop, ...rest } = p;
				void _id;
				void _creationTime;
				void _drop;
				await ctx.db.replace(p._id, rest);
				proposalsTouched += 1;
			}
		}

		return { markets: marketsTouched, proposals: proposalsTouched };
	},
});
