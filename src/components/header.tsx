import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
	Authenticated,
	Unauthenticated,
	useConvexAuth,
	useMutation,
	useQuery,
} from "convex/react";
import {
	Activity,
	Menu,
	Plus,
	Search,
	Store,
	Trophy,
	User as UserIcon,
	Wallet,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { CURRENCY_SYMBOL } from "@/lib/tickets";
import { cn } from "@/lib/utils";
import { useBalance } from "@/lib/wallet";
import { api } from "../../convex/_generated/api";
import { AuthControls, SignInButton } from "./auth-controls";
import { BracketChip } from "./console";
import { ThemeToggle } from "./theme-toggle";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

const navLinks: { to: string; label: string; icon: IconType }[] = [
	{ to: "/tickets", label: "Tickets", icon: Store },
	{ to: "/activity", label: "Activity", icon: Activity },
	{ to: "/leaderboard", label: "Leaderboard", icon: Trophy },
	{ to: "/portfolio", label: "Portfolio", icon: Wallet },
];

export function Header() {
	const { location } = useRouterState();
	const pathname = location.pathname;
	const { balance, mounted } = useBalance();
	const navigate = useNavigate();
	const [query, setQuery] = useState("");
	const [focused, setFocused] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const allTickets = useQuery(api.tickets.list, {});
	const liveCount = allTickets?.filter((m) => m.status === "open").length;
	useDailyBonus();

	const trimmedQ = query.trim();
	const searchOpen = focused && trimmedQ.length >= 1;
	const userResults = useQuery(
		api.users.search,
		searchOpen ? { q: trimmedQ, limit: 5 } : "skip"
	);
	const ticketResults = useMemo(() => {
		if (!searchOpen || !allTickets) return [];
		const needle = trimmedQ.toLowerCase();
		return allTickets
			.filter((m) => {
				if (m.question.toLowerCase().includes(needle)) return true;
				if (m.tags.some((t) => t.toLowerCase().includes(needle))) return true;
				const name = (m.subject?.name ?? "").toLowerCase();
				const handle = (m.subject?.handle ?? "").toLowerCase();
				return name.includes(needle) || handle.includes(needle);
			})
			.sort((a, b) => {
				// open first, then by volume
				const aOpen = a.status === "open" ? 0 : 1;
				const bOpen = b.status === "open" ? 0 : 1;
				if (aOpen !== bOpen) return aOpen - bOpen;
				return b.volume - a.volume;
			})
			.slice(0, 5);
	}, [searchOpen, allTickets, trimmedQ]);

	const submitSearch = () => {
		const q = query.trim();
		navigate({
			to: "/tickets",
			search: q ? { q } : {},
		});
		setFocused(false);
		inputRef.current?.blur();
	};

	const goToTicket = (slug: string) => {
		setFocused(false);
		setQuery("");
		inputRef.current?.blur();
		navigate({ to: "/ticket/$id", params: { id: slug } });
	};

	const goToProfile = (handle: string) => {
		setFocused(false);
		setQuery("");
		inputRef.current?.blur();
		navigate({
			to: "/profile/$username",
			params: { username: handle.replace(/^@/, "") },
		});
	};

	const balanceText = mounted ? Math.round(balance).toLocaleString() : "2,000";

	return (
		<header className="sticky top-0 z-30 border-rule border-b bg-ink/90 backdrop-blur">
			<div className="mx-auto flex w-full max-w-[1280px] items-center gap-3 px-4 py-3 sm:gap-5 sm:px-6">
				<Sheet>
					<SheetTrigger asChild>
						<Button
							variant="ghost"
							size="icon-sm"
							className="lg:hidden"
							aria-label="Open menu"
						>
							<Menu />
						</Button>
					</SheetTrigger>
					<SheetContent
						side="left"
						className="w-72 border-rule border-r bg-ink p-0"
					>
						<SheetHeader className="border-rule border-b px-5 py-4">
							<SheetTitle>
								<Wordmark />
							</SheetTitle>
						</SheetHeader>
						<nav className="flex flex-col">
							{navLinks.map((l) => {
								const active = pathname.startsWith(l.to);
								const Icon = l.icon;
								return (
									<SheetClose asChild key={l.to}>
										<Link
											to={l.to}
											className={cn(
												"flex items-center gap-3 border-rule border-b px-5 py-4 font-mono text-[12px] uppercase tracking-[0.14em] transition-colors",
												active
													? "bg-brand-wash text-brand"
													: "text-bone-2 hover:bg-ink-2 hover:text-bone"
											)}
										>
											<Icon className="size-4" />
											{l.label}
										</Link>
									</SheetClose>
								);
							})}
						</nav>
						<div className="mt-auto space-y-3 border-rule border-t p-5">
							<Authenticated>
								<div className="flex items-center justify-between border border-rule bg-ink-2 px-3 py-2">
									<span className="label">Balance</span>
									<span className="font-bold font-mono text-brand text-sm tabular-nums">
										{CURRENCY_SYMBOL}
										{balanceText}
									</span>
								</div>
								<SheetClose asChild>
									<Button asChild size="sm" className="w-full">
										<Link to="/create">
											<Plus /> New ticket
										</Link>
									</Button>
								</SheetClose>
							</Authenticated>
							<Unauthenticated>
								<p className="text-bone-2 text-sm">
									Sign in to trade. Everyone starts with {CURRENCY_SYMBOL}2,000
									in play-money shekels.
								</p>
								<SignInButton className="w-full" label="Sign in with Google" />
							</Unauthenticated>
						</div>
					</SheetContent>
				</Sheet>

				<Link to="/" className="flex shrink-0 items-center gap-2.5">
					<Wordmark />
				</Link>

				{liveCount !== undefined && liveCount > 0 ? (
					<BracketChip pulse className="hidden md:inline-flex">
						LIVE · {liveCount}
					</BracketChip>
				) : null}

				<search className="relative hidden flex-1 md:block">
					<form
						onSubmit={(e) => {
							e.preventDefault();
							submitSearch();
						}}
					>
						<div className="relative max-w-md">
							<Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-bone-3" />
							<Input
								ref={inputRef}
								type="search"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								onFocus={() => setFocused(true)}
								onBlur={() => {
									// Delay so mousedown on dropdown items fires first
									setTimeout(() => setFocused(false), 100);
								}}
								onKeyDown={(e) => {
									if (e.key === "Escape") {
										setFocused(false);
										inputRef.current?.blur();
									}
								}}
								placeholder="Find a ticket or person…"
								className="pl-9 font-sans"
								aria-label="Search tickets and users"
							/>
						</div>
					</form>
					{searchOpen ? (
						<SearchDropdown
							query={trimmedQ}
							users={userResults}
							tickets={ticketResults}
							onUserPick={goToProfile}
							onTicketPick={goToTicket}
							onSeeAll={submitSearch}
						/>
					) : null}
				</search>

				<nav className="hidden items-center gap-1 lg:flex">
					{navLinks.map((l) => {
						const active = pathname.startsWith(l.to);
						const Icon = l.icon;
						return (
							<Link
								key={l.to}
								to={l.to}
								className={cn(
									"flex items-center gap-1.5 rounded-[4px] px-3 py-2 font-mono font-semibold text-[11px] uppercase tracking-[0.14em] transition-colors",
									active
										? "bg-brand-wash text-brand"
										: "text-bone-2 hover:bg-ink-3 hover:text-bone"
								)}
							>
								<Icon className="size-3.5" strokeWidth={2} />
								{l.label}
							</Link>
						);
					})}
				</nav>

				<div className="ml-auto flex items-center gap-2 sm:gap-3">
					<ThemeToggle />
					<Authenticated>
						<div
							className="hidden h-9 items-center gap-2 rounded-[4px] border border-rule bg-ink-2 px-3 sm:flex"
							title="Your shekel balance"
						>
							<span className="label leading-none">Cash</span>
							<span className="font-bold font-mono text-bone text-sm tabular-nums">
								{CURRENCY_SYMBOL}
								{balanceText}
							</span>
						</div>
					</Authenticated>
					<AuthControls />
					<Unauthenticated>
						<SignInButton
							variant="default"
							size="sm"
							className="md:hidden"
							label="Sign in"
						/>
					</Unauthenticated>
				</div>
			</div>
		</header>
	);
}

/**
 * Fires once per mount after auth resolves. Server-side is idempotent — only
 * grants ₪50 if 24h has elapsed since last claim. Per-tab dedupe via
 * sessionStorage so toggling tabs doesn't spam the toast.
 */
function useDailyBonus() {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const claim = useMutation(api.wallet.claimDailyIfDue);

	useEffect(() => {
		if (isLoading || !isAuthenticated) return;
		if (typeof window === "undefined") return;
		const flag = "daily-bonus-checked-v1";
		if (sessionStorage.getItem(flag)) return;
		sessionStorage.setItem(flag, "1");
		claim({})
			.then((r) => {
				if (r.granted) {
					toast.success(`Daily bonus · +${CURRENCY_SYMBOL}${r.amount}`, {
						description: "Come back tomorrow for another ₪50.",
					});
				}
			})
			.catch(() => {
				// Silent — non-critical. Will retry on next session.
				sessionStorage.removeItem(flag);
			});
	}, [isAuthenticated, isLoading, claim]);
}

type UserHit = {
	_id: string;
	handle: string;
	name: string | null;
	image: string | null;
};

type TicketHit = {
	_id: string;
	slug: string;
	question: string;
	yesPrice: number;
	status: "open" | "closed" | "resolved" | "cancelled";
	resolution?: "Yes" | "No";
	subject: { name: string; handle?: string } | null;
};

function SearchDropdown({
	query,
	users,
	tickets,
	onUserPick,
	onTicketPick,
	onSeeAll,
}: {
	query: string;
	users: UserHit[] | undefined;
	tickets: TicketHit[];
	onUserPick: (handle: string) => void;
	onTicketPick: (slug: string) => void;
	onSeeAll: () => void;
}) {
	const userCount = users?.length ?? 0;
	const ticketCount = tickets.length;
	const loading = users === undefined;

	return (
		<div className="absolute top-full left-0 z-40 mt-1.5 w-full max-w-md overflow-hidden border border-rule bg-ink shadow-lg">
			{loading ? (
				<div className="px-3 py-3 font-mono text-[11px] text-bone-3 uppercase tracking-[0.12em]">
					Searching…
				</div>
			) : userCount === 0 && ticketCount === 0 ? (
				<div className="px-3 py-3 font-mono text-[11px] text-bone-3 uppercase tracking-[0.12em]">
					No matches for "{query}".
				</div>
			) : (
				<>
					{userCount > 0 ? (
						<section>
							<div className="border-rule border-b bg-ink-2 px-3 py-1.5">
								<span className="font-bold font-mono text-[10px] text-bone-3 uppercase tracking-[0.16em]">
									People
								</span>
							</div>
							<ul>
								{users?.map((u) => (
									<li key={u._id}>
										<button
											type="button"
											onMouseDown={(e) => {
												e.preventDefault();
												onUserPick(u.handle);
											}}
											className="flex w-full items-center gap-3 border-rule border-b px-3 py-2 text-left transition last:border-b-0 hover:bg-brand-wash"
										>
											{u.image ? (
												<img
													src={u.image}
													alt=""
													className="size-7 border border-rule object-cover"
												/>
											) : (
												<div className="grid size-7 place-items-center border border-rule bg-ink-2">
													<UserIcon className="size-3.5 text-bone-3" />
												</div>
											)}
											<div className="min-w-0 flex-1">
												<div className="truncate font-display font-semibold text-sm">
													{u.name ?? u.handle}
												</div>
												<div className="font-mono text-[10px] text-bone-3 uppercase tracking-[0.12em]">
													{u.handle}
												</div>
											</div>
										</button>
									</li>
								))}
							</ul>
						</section>
					) : null}

					{ticketCount > 0 ? (
						<section>
							<div className="border-rule border-y bg-ink-2 px-3 py-1.5">
								<span className="font-bold font-mono text-[10px] text-bone-3 uppercase tracking-[0.16em]">
									Tickets
								</span>
							</div>
							<ul>
								{tickets.map((t) => {
									const isClosed = t.status !== "open";
									return (
										<li key={t._id}>
											<button
												type="button"
												onMouseDown={(e) => {
													e.preventDefault();
													onTicketPick(t.slug);
												}}
												className="flex w-full items-start gap-3 border-rule border-b px-3 py-2 text-left transition last:border-b-0 hover:bg-brand-wash"
											>
												<div className="min-w-0 flex-1">
													<div
														className={cn(
															"line-clamp-1 font-display font-semibold text-sm",
															isClosed && "text-bone-2"
														)}
													>
														{t.question}
													</div>
													<div className="mt-0.5 font-mono text-[10px] text-bone-3 uppercase tracking-[0.12em]">
														{t.subject ? `ABOUT ${t.subject.name}` : ""}
														{t.subject ? " · " : ""}
														{isClosed
															? t.status === "resolved"
																? `RESOLVED ${t.resolution ?? ""}`
																: t.status.toUpperCase()
															: "LIVE"}
													</div>
												</div>
												<span
													className={cn(
														"shrink-0 font-bold font-mono text-sm tabular-nums",
														isClosed ? "text-bone-3" : "text-brand"
													)}
												>
													{CURRENCY_SYMBOL}
													{Math.round(t.yesPrice * 100)}
												</span>
											</button>
										</li>
									);
								})}
							</ul>
						</section>
					) : null}

					<button
						type="button"
						onMouseDown={(e) => {
							e.preventDefault();
							onSeeAll();
						}}
						className="block w-full bg-ink-2 px-3 py-2 text-left font-mono font-semibold text-[10px] text-bone-2 uppercase tracking-[0.14em] transition hover:bg-brand-wash hover:text-brand"
					>
						→ See all matches for "{query}" in /tickets
					</button>
				</>
			)}
		</div>
	);
}

function Wordmark() {
	return (
		<span className="flex items-baseline gap-0 font-display font-extrabold text-bone text-lg leading-none tracking-[-0.04em] sm:text-xl">
			<span>CHARLES</span>
			<span className="text-brand" aria-hidden="true">
				.
			</span>
			<span>MARKET</span>
		</span>
	);
}
