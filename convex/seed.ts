import { mutation } from "./_generated/server";

const DAY = 86_400_000;
const HOUR = 3_600_000;

type SeedMarket = {
	slug: string;
	question: string;
	description: string;
	category: string;
	yesPrice: number;
	volume: number;
	liquidity: number;
	openInterest: number;
	closesAt: string;
	closesInMs: number;
	tags: string[];
};

const seedMarkets: SeedMarket[] = [
	{
		slug: "charles-late-friday",
		question: "Will Charles show up more than 30 minutes late on Friday?",
		description:
			"Resolves YES if Charles arrives more than 30 minutes after the agreed meet time at the Friday hang. Group chat timestamps are the source of truth.",
		category: "Antics",
		yesPrice: 0.78,
		volume: 12_430,
		liquidity: 4_800,
		openInterest: 8_120,
		closesAt: "Fri 9:00 PM",
		closesInMs: 2 * DAY + 4 * HOUR,
		tags: ["weekend", "friday-hang"],
	},
	{
		slug: "charles-new-job",
		question: "Will Charles start a new job before July?",
		description:
			"Resolves YES if Charles signs an offer letter and begins a new role with a different employer before July 1.",
		category: "Career",
		yesPrice: 0.34,
		volume: 9_120,
		liquidity: 3_250,
		openInterest: 5_400,
		closesAt: "Jun 30",
		closesInMs: 47 * DAY,
		tags: ["career", "deadline"],
	},
	{
		slug: "charles-gym-streak",
		question: "Will Charles hit the gym 5 times this week?",
		description:
			"Resolves YES if Charles posts at least 5 distinct gym check-ins (Strava, mirror selfies, or door-tap logs) between Mon 12:00 AM and Sun 11:59 PM.",
		category: "Health",
		yesPrice: 0.12,
		volume: 6_780,
		liquidity: 1_900,
		openInterest: 3_300,
		closesAt: "Sun 11:59 PM",
		closesInMs: 5 * DAY,
		tags: ["weekly", "fitness"],
	},
	{
		slug: "charles-text-back",
		question: "Will Charles reply to the group chat within 24 hours?",
		description:
			"Resolves YES if Charles sends any non-emoji message to the main group chat within 24h of the market opening.",
		category: "Relationships",
		yesPrice: 0.41,
		volume: 3_540,
		liquidity: 1_200,
		openInterest: 1_900,
		closesAt: "Tomorrow 6 PM",
		closesInMs: 18 * HOUR,
		tags: ["short-term"],
	},
	{
		slug: "charles-haircut",
		question: "Will Charles get a haircut before the wedding?",
		description:
			"Resolves YES if Charles posts visible evidence of a haircut (selfie or barber receipt) before May 28.",
		category: "Antics",
		yesPrice: 0.67,
		volume: 5_010,
		liquidity: 2_100,
		openInterest: 2_700,
		closesAt: "May 28",
		closesInMs: 11 * DAY,
		tags: ["grooming", "wedding"],
	},
	{
		slug: "charles-locks-keys",
		question: "Will Charles lock himself out again this month?",
		description:
			"Resolves YES if Charles is locked out of his apartment, car, or office for ≥30 minutes during the calendar month.",
		category: "Mishaps",
		yesPrice: 0.83,
		volume: 14_900,
		liquidity: 5_600,
		openInterest: 9_800,
		closesAt: "End of month",
		closesInMs: 16 * DAY,
		tags: ["chaotic"],
	},
	{
		slug: "charles-coffee-spill",
		question: "Will Charles spill coffee on his laptop this quarter?",
		description:
			"Resolves YES if Charles spills any drink on his laptop and requires a repair or replacement before Q3.",
		category: "Mishaps",
		yesPrice: 0.55,
		volume: 8_220,
		liquidity: 2_700,
		openInterest: 4_400,
		closesAt: "Jun 30",
		closesInMs: 62 * DAY,
		tags: ["chaos", "quarterly"],
	},
	{
		slug: "charles-second-date",
		question: "Will Charles go on a 2nd date with Lauren?",
		description:
			"Resolves YES if Charles and Lauren go on a confirmed second date (any one-on-one meetup) before May 24.",
		category: "Relationships",
		yesPrice: 0.29,
		volume: 11_440,
		liquidity: 3_900,
		openInterest: 6_900,
		closesAt: "May 24",
		closesInMs: 9 * DAY,
		tags: ["dating"],
	},
	{
		slug: "charles-flight-delay",
		question: "Will Charles miss his connecting flight in Denver?",
		description:
			"Resolves YES if Charles fails to board his Denver connecting flight and is rebooked.",
		category: "Travel",
		yesPrice: 0.22,
		volume: 4_100,
		liquidity: 1_600,
		openInterest: 2_100,
		closesAt: "Sun 7:45 AM",
		closesInMs: 3 * DAY,
		tags: ["travel"],
	},
	{
		slug: "charles-venmo-debt",
		question: "Will Charles pay Marcus back this month?",
		description:
			"Resolves YES if Charles Venmos Marcus the agreed ₪84 before the end of the month.",
		category: "Money",
		yesPrice: 0.18,
		volume: 7_300,
		liquidity: 2_200,
		openInterest: 3_700,
		closesAt: "End of month",
		closesInMs: 16 * DAY,
		tags: ["debts"],
	},
	{
		slug: "charles-marathon",
		question: "Will Charles finish the half-marathon in under 2:00?",
		description:
			"Resolves YES if Charles crosses the finish line in under 2:00:00 official chip time at the June half.",
		category: "Health",
		yesPrice: 0.46,
		volume: 5_700,
		liquidity: 2_400,
		openInterest: 3_100,
		closesAt: "Jun 8",
		closesInMs: 24 * DAY,
		tags: ["fitness", "race"],
	},
	{
		slug: "charles-no-snooze",
		question: "Will Charles wake up to his first alarm 5 days this week?",
		description:
			"Resolves YES if Charles's sleep tracker logs ≤1 snooze on 5 weekdays.",
		category: "Antics",
		yesPrice: 0.09,
		volume: 2_980,
		liquidity: 900,
		openInterest: 1_200,
		closesAt: "Fri 9:00 AM",
		closesInMs: 5 * DAY,
		tags: ["weekly"],
	},
];

export const run = mutation({
	args: {},
	handler: async (ctx) => {
		const existing = await ctx.db.query("markets").take(1);
		if (existing.length > 0) {
			return { inserted: 0, skipped: "markets already seeded" };
		}
		const now = Date.now();
		let inserted = 0;
		for (const m of seedMarkets) {
			await ctx.db.insert("markets", {
				slug: m.slug,
				question: m.question,
				description: m.description,
				category: m.category,
				yesPrice: m.yesPrice,
				volume: m.volume,
				liquidity: m.liquidity,
				openInterest: m.openInterest,
				closesAt: m.closesAt,
				closesAtMs: now + m.closesInMs,
				tags: m.tags,
				status: "open",
				createdAt: now,
			});
			inserted += 1;
		}
		return { inserted, skipped: null };
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
			"markets",
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
