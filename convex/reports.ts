import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { cancelTicketPositions } from "./admin";
import { currentUser, isAdminUser, requireAdmin, requireUser } from "./users";

export const submit = mutation({
	args: {
		ticketId: v.id("tickets"),
		description: v.string(),
	},
	handler: async (ctx, { ticketId, description }) => {
		const user = await requireUser(ctx);
		const ticket = await ctx.db.get(ticketId);
		if (!ticket) throw new Error("Ticket not found");
		if (ticket.status !== "open")
			throw new Error("Can only report open tickets");
		const desc = description.trim();
		if (!desc) throw new Error("Description is required");
		if (desc.length > 2000)
			throw new Error("Description must be 2,000 characters or fewer");

		await ctx.db.insert("ticketReports", {
			ticketId,
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
				const ticket = await ctx.db.get(r.ticketId);
				const reporter = await ctx.db.get(r.reporterId);
				return {
					_id: r._id,
					_creationTime: r._creationTime,
					ticketId: r.ticketId,
					ticketQuestion: ticket?.question ?? "Deleted ticket",
					ticketSlug: ticket?.slug ?? "",
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

		const ticket = await ctx.db.get(report.ticketId);
		if (
			ticket &&
			ticket.status !== "resolved" &&
			ticket.status !== "cancelled"
		) {
			await cancelTicketPositions(ctx, report.ticketId);
			await ctx.db.patch(report.ticketId, {
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
