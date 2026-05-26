import { mutation } from "./_generated/server";

export const run = mutation({
	args: {},
	handler: async () => {
		return {
			inserted: 0,
			skipped:
				"Tickets now require a subject + creator user. Create them through the UI at /create.",
		};
	},
});

export const wipe = mutation({
	args: {},
	handler: async (ctx) => {
		const tables = [
			"trades",
			"positions",
			"comments",
			"priceTicks",
			"tickets",
			"ticketReports",
		] as const;
		let deleted = 0;
		for (const table of tables) {
			const rows = await ctx.db.query(table).collect();
			for (const r of rows) {
				await ctx.db.delete(r._id);
				deleted += 1;
			}
		}
		return { deleted };
	},
});
