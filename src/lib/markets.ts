export type Category =
	| "Antics"
	| "Mishaps"
	| "Relationships"
	| "Career"
	| "Health"
	| "Travel"
	| "Money";

export type Outcome = "Yes" | "No";

export type PriceTick = {
	t: number;
	yes: number;
};

export type Market = {
	id: string;
	slug: string;
	question: string;
	description: string;
	category: Category;
	yesPrice: number;
	volume: number;
	liquidity: number;
	openInterest: number;
	closesAt: string;
	closesIn: string;
	trend: "up" | "down" | "flat";
	delta: number;
	tags: string[];
	history: PriceTick[];
};

function trail(yes: number, points = 24, drift = 0.02): PriceTick[] {
	let s = Math.floor(yes * 1_000_003) || 1;
	const rand = () => {
		s = (s * 16_807) % 2_147_483_647;
		return s / 2_147_483_647;
	};
	const out: PriceTick[] = [];
	let v = Math.max(0.02, Math.min(0.98, yes - drift * points * 0.5));
	for (let i = points - 1; i >= 0; i--) {
		v = Math.max(0.02, Math.min(0.98, v + drift * (rand() - 0.5) * 2));
		out.push({ t: i, yes: v });
	}
	out[out.length - 1] = { t: 0, yes };
	return out;
}

export const markets: Market[] = [
	{
		id: "charles-late-friday",
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
		closesIn: "2d 4h",
		trend: "up",
		delta: 0.06,
		tags: ["weekend", "friday-hang"],
		history: trail(0.78),
	},
	{
		id: "charles-new-job",
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
		closesIn: "47d",
		trend: "down",
		delta: -0.04,
		tags: ["career", "deadline"],
		history: trail(0.34),
	},
	{
		id: "charles-gym-streak",
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
		closesIn: "5d",
		trend: "down",
		delta: -0.09,
		tags: ["weekly", "fitness"],
		history: trail(0.12),
	},
	{
		id: "charles-text-back",
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
		closesIn: "18h",
		trend: "flat",
		delta: 0.0,
		tags: ["short-term"],
		history: trail(0.41),
	},
	{
		id: "charles-haircut",
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
		closesIn: "11d",
		trend: "up",
		delta: 0.08,
		tags: ["grooming", "wedding"],
		history: trail(0.67),
	},
	{
		id: "charles-locks-keys",
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
		closesIn: "16d",
		trend: "up",
		delta: 0.03,
		tags: ["chaotic"],
		history: trail(0.83),
	},
	{
		id: "charles-coffee-spill",
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
		closesIn: "62d",
		trend: "up",
		delta: 0.02,
		tags: ["chaos", "quarterly"],
		history: trail(0.55),
	},
	{
		id: "charles-second-date",
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
		closesIn: "9d",
		trend: "down",
		delta: -0.07,
		tags: ["dating"],
		history: trail(0.29),
	},
	{
		id: "charles-flight-delay",
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
		closesIn: "3d",
		trend: "flat",
		delta: 0.01,
		tags: ["travel"],
		history: trail(0.22),
	},
	{
		id: "charles-venmo-debt",
		slug: "charles-venmo-debt",
		question: "Will Charles pay Marcus back this month?",
		description:
			"Resolves YES if Charles Venmos Marcus the agreed $84 before the end of the month.",
		category: "Money",
		yesPrice: 0.18,
		volume: 7_300,
		liquidity: 2_200,
		openInterest: 3_700,
		closesAt: "End of month",
		closesIn: "16d",
		trend: "down",
		delta: -0.03,
		tags: ["debts"],
		history: trail(0.18),
	},
	{
		id: "charles-marathon",
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
		closesIn: "24d",
		trend: "up",
		delta: 0.05,
		tags: ["fitness", "race"],
		history: trail(0.46),
	},
	{
		id: "charles-no-snooze",
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
		closesIn: "5d",
		trend: "down",
		delta: -0.02,
		tags: ["weekly"],
		history: trail(0.09),
	},
];

export const categories: Category[] = [
	"Antics",
	"Mishaps",
	"Relationships",
	"Career",
	"Health",
	"Travel",
	"Money",
];

export function getMarket(id: string): Market | undefined {
	return markets.find((m) => m.id === id || m.slug === id);
}

export const CURRENCY_SYMBOL = "₪";
export const CURRENCY_NAME = "shekels";
export const STARTING_BALANCE = 1000;

export function money(n: number): string {
	if (n >= 1_000_000) return `${CURRENCY_SYMBOL}${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${CURRENCY_SYMBOL}${(n / 1_000).toFixed(1)}k`;
	return `${CURRENCY_SYMBOL}${Math.round(n)}`;
}

export function cents(n: number): string {
	return `${CURRENCY_SYMBOL}${Math.round(n * 100)}`;
}

export function pct(n: number): string {
	return `${Math.round(n * 100)}%`;
}

export function formatClosesIn(closesAtMs: number, now = Date.now()): string {
	const diff = closesAtMs - now;
	if (diff <= 0) return "closed";
	const day = 86_400_000;
	const hour = 3_600_000;
	const minute = 60_000;
	const days = Math.floor(diff / day);
	if (days >= 7) return `${Math.floor(days / 7)}w`;
	if (days >= 1) {
		const hours = Math.floor((diff - days * day) / hour);
		return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
	}
	const hours = Math.floor(diff / hour);
	if (hours >= 1) return `${hours}h`;
	const mins = Math.max(1, Math.floor(diff / minute));
	return `${mins}m`;
}

export type ConvexMarket = {
	_id: string;
	_creationTime: number;
	slug: string;
	question: string;
	description: string;
	category: string;
	yesPrice: number;
	volume: number;
	liquidity: number;
	openInterest: number;
	closesAt: string;
	closesAtMs: number;
	tags: string[];
	status: "open" | "closed" | "resolved" | "cancelled";
	resolution?: "Yes" | "No";
	createdAt: number;
};

export type UIMarket = Market & { _id: string };

export function toUIMarket(
	doc: ConvexMarket,
	history?: { yesPrice: number }[]
): UIMarket {
	const yesterday =
		history && history.length > 1 ? history[0].yesPrice : doc.yesPrice;
	const delta = doc.yesPrice - yesterday;
	const trend: Market["trend"] =
		delta > 0.005 ? "up" : delta < -0.005 ? "down" : "flat";
	return {
		_id: doc._id,
		id: doc._id,
		slug: doc.slug,
		question: doc.question,
		description: doc.description,
		category: doc.category as Category,
		yesPrice: doc.yesPrice,
		volume: doc.volume,
		liquidity: doc.liquidity,
		openInterest: doc.openInterest,
		closesAt: doc.closesAt,
		closesIn: formatClosesIn(doc.closesAtMs),
		trend,
		delta,
		tags: doc.tags,
		history: history?.map((h, i) => ({ t: i, yes: h.yesPrice })) ?? [],
	};
}

export { trail };
