import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { cancelMarketPositions } from "./admin";
import { currentUser, isAdminUser, requireAdmin, requireUser } from "./users";

export const submit = mutation({
	args: {
		marketId: v.id("markets"),
		description: v.string(),
	},
	handler: async (ctx, { marketId, description }) => {
		const user = await requireUser(ctx);
		const market = await ctx.db.get(marketId);
		if (!market) throw new Error("Ticket not found");
		if (market.status !== "open")
			throw new Error("Can only report open tickets");
		const desc = description.trim();
		if (!desc) throw new Error("Description is required");
		if (desc.length > 2000)
			throw new Error("Description must be 2,000 characters or fewer");

		await ctx.db.insert("ticketReports", {
			marketId,
			reporterId: user._id,
			description: desc,
			status: "pending",
		});
		return { ok: true };
	},
});

export const pendingCount = query({
	args: {},
	handler: async (ctx) => {
		const user = await currentUser(ctx);
		if (!isAdminUser(user)) return 0;
		const reports = await ctx.db
			.query("ticketReports")
			.withIndex("by_status", (q) => q.eq("status", "pending"))
			.collect();
		return reports.length;
	},
});

export const listPending = query({
	args: {},
	handler: async (ctx) => {
		const user = await currentUser(ctx);
		if (!isAdminUser(user)) return [];
		const reports = await ctx.db
			.query("ticketReports")
			.withIndex("by_status", (q) => q.eq("status", "pending"))
			.collect();
		return await Promise.all(
			reports.map(async (r) => {
				const market = await ctx.db.get(r.marketId);
				const reporter = await ctx.db.get(r.reporterId);
				return {
					_id: r._id,
					_creationTime: r._creationTime,
					marketId: r.marketId,
					marketQuestion: market?.question ?? "Deleted ticket",
					marketSlug: market?.slug ?? "",
					reporterHandle: reporter?.handle ?? "@anon",
					description: r.description,
					status: r.status,
				};
			})
		);
	},
});

export const validate = mutation({
	args: { reportId: v.id("ticketReports") },
	handler: async (ctx, { reportId }) => {
		const admin = await requireAdmin(ctx);
		const report = await ctx.db.get(reportId);
		if (!report) throw new Error("Report not found");
		if (report.status !== "pending") throw new Error("Report already reviewed");

		const market = await ctx.db.get(report.marketId);
		if (
			market &&
			market.status !== "resolved" &&
			market.status !== "cancelled"
		) {
			await cancelMarketPositions(ctx, report.marketId);
			await ctx.db.patch(report.marketId, {
				status: "cancelled",
				openInterest: 0,
			});
		}

		await ctx.db.patch(reportId, {
			status: "validated",
			reviewedBy: admin._id,
			reviewedAt: Date.now(),
		});
		return { ok: true };
	},
});

export const dismiss = mutation({
	args: { reportId: v.id("ticketReports") },
	handler: async (ctx, { reportId }) => {
		const admin = await requireAdmin(ctx);
		const report = await ctx.db.get(reportId);
		if (!report) throw new Error("Report not found");
		if (report.status !== "pending") throw new Error("Report already reviewed");

		await ctx.db.patch(reportId, {
			status: "rejected",
			reviewedBy: admin._id,
			reviewedAt: Date.now(),
		});
		return { ok: true };
	},
});
