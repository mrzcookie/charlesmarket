import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";
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
import { Badge } from "@/components/ui/badge";
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
import { AuthControls, SignInButton } from "./auth-controls";
import { ThemeToggle } from "./theme-toggle";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

const navLinks: { to: string; label: string; icon: IconType }[] = [
	{ to: "/markets", label: "Markets", icon: Store },
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

	const submitSearch = () => {
		const q = query.trim();
		navigate({
			to: "/markets",
			search: q ? { q } : { category: "All" },
		});
	};

	const balanceText = mounted ? Math.round(balance).toLocaleString() : "1,000";

	return (
		<header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
			<div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:gap-6 sm:px-6">
				<Sheet>
					<SheetTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="lg:hidden"
							aria-label="Open menu"
						>
							<Menu />
						</Button>
					</SheetTrigger>
					<SheetContent side="left" className="w-72 p-0">
						<SheetHeader>
							<SheetTitle className="flex items-center gap-2">
								<div className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-black text-primary-foreground text-sm">
									C
								</div>
								Charlesmarket
							</SheetTitle>
						</SheetHeader>
						<nav className="flex flex-col gap-1 px-3">
							{navLinks.map((l) => {
								const active = pathname.startsWith(l.to);
								const Icon = l.icon;
								return (
									<SheetClose asChild key={l.to}>
										<Link
											to={l.to}
											className={cn(
												"flex items-center gap-2 rounded-md px-3 py-2 font-medium text-sm",
												active
													? "bg-accent text-accent-foreground"
													: "text-foreground hover:bg-muted"
											)}
										>
											<Icon className="size-4" />
											{l.label}
										</Link>
									</SheetClose>
								);
							})}
						</nav>
						<div className="mt-auto space-y-3 border-t p-4">
							<Authenticated>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground text-sm">Balance</span>
									<Badge variant="brand" className="font-mono">
										{CURRENCY_SYMBOL}
										{balanceText}
									</Badge>
								</div>
								<SheetClose asChild>
									<Button asChild size="sm" className="w-full">
										<Link to="/propose">
											<Plus /> Propose a market
										</Link>
									</Button>
								</SheetClose>
							</Authenticated>
							<Unauthenticated>
								<p className="text-muted-foreground text-sm">
									Sign in to trade and start with {CURRENCY_SYMBOL}1,000.
								</p>
								<SignInButton className="w-full" label="Sign in with Google" />
							</Unauthenticated>
						</div>
					</SheetContent>
				</Sheet>

				<Link to="/" className="flex shrink-0 items-center gap-2">
					<div className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-black text-primary-foreground text-sm">
						C
					</div>
					<span className="font-semibold text-base tracking-tight">
						Charlesmarket
					</span>
				</Link>

				<search className="hidden flex-1 md:block">
					<form
						onSubmit={(e) => {
							e.preventDefault();
							submitSearch();
						}}
					>
						<div className="relative max-w-md">
							<Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								type="search"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="Search Charles markets…"
								className="bg-muted pl-9"
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
							<Button
								key={l.to}
								variant="ghost"
								size="sm"
								asChild
								className={cn(
									"font-medium text-muted-foreground",
									active && "text-primary hover:text-primary"
								)}
							>
								<Link to={l.to}>
									<Icon />
									{l.label}
								</Link>
							</Button>
						);
					})}
				</nav>

				<div className="ml-auto flex items-center gap-2">
					<ThemeToggle />
					<Authenticated>
						<Badge
							variant="brand"
							className="hidden h-9 gap-1.5 rounded-md px-3 font-mono text-sm sm:inline-flex"
							title="Your shekel balance"
						>
							<span className="text-base leading-none">{CURRENCY_SYMBOL}</span>
							<span className="tabular-nums">{balanceText}</span>
						</Badge>
					</Authenticated>
					<AuthControls />
					<Unauthenticated>
						<SignInButton
							variant="default"
							className="md:hidden"
							label="Sign in"
						/>
					</Unauthenticated>
				</div>
			</div>
		</header>
	);
}
