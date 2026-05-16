import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import {
	Activity,
	Menu,
	Plus,
	Search,
	Store,
	Trophy,
	Wallet,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { useState } from "react";
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
import { CURRENCY_SYMBOL } from "@/lib/markets";
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
	const openMarkets = useQuery(api.markets.list, {});
	const liveCount = openMarkets?.filter((m) => m.status === "open").length;

	const submitSearch = () => {
		const q = query.trim();
		navigate({
			to: "/tickets",
			search: q ? { q } : { category: "All" },
		});
	};

	const balanceText = mounted ? Math.round(balance).toLocaleString() : "1,000";

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
										<Link to="/propose">
											<Plus /> Propose ticket
										</Link>
									</Button>
								</SheetClose>
							</Authenticated>
							<Unauthenticated>
								<p className="text-bone-2 text-sm">
									Sign in to trade. Everyone starts with {CURRENCY_SYMBOL}1,000
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

				<search className="hidden flex-1 md:block">
					<form
						onSubmit={(e) => {
							e.preventDefault();
							submitSearch();
						}}
					>
						<div className="relative max-w-md">
							<Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-bone-3" />
							<Input
								type="search"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="Find a ticket on Charles…"
								className="pl-9 font-sans"
								aria-label="Search markets"
							/>
						</div>
					</form>
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
