import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { LogIn, LogOut, Plus, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "../../convex/_generated/api";

export function SignInButton({
	size = "sm",
	variant = "outline",
	className,
	label = "Log in",
}: {
	size?: "sm" | "default" | "lg";
	variant?: "default" | "outline" | "ghost" | "secondary";
	className?: string;
	label?: string;
}) {
	const { signIn } = useAuthActions();
	return (
		<Button
			variant={variant}
			size={size}
			className={className}
			onClick={() => {
				signIn("google").catch((err) => {
					toast.error("Sign-in failed", {
						description: err instanceof Error ? err.message : String(err),
					});
				});
			}}
		>
			<LogIn /> {label}
		</Button>
	);
}

export function UserMenu() {
	const { signOut } = useAuthActions();
	const me = useQuery(api.users.me);
	const initial = me?.name?.[0] ?? me?.email?.[0] ?? me?.handle?.[1] ?? "C";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className="h-9 gap-2 rounded-full p-1 pr-3"
					aria-label="Account menu"
				>
					<Avatar className="size-7">
						{me?.image ? <AvatarImage src={me.image} alt="" /> : null}
						<AvatarFallback className="bg-gradient-to-br from-primary to-brand-700 font-semibold text-primary-foreground text-xs">
							{initial.toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<span className="hidden font-medium text-sm sm:inline">
						{me?.handle ?? "@you"}
					</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel className="flex flex-col">
					<span className="font-semibold text-sm">{me?.handle ?? "@you"}</span>
					{me?.email && (
						<span className="truncate font-normal text-muted-foreground text-xs">
							{me.email}
						</span>
					)}
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<a href="/profile">
						<User /> Profile
					</a>
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<a href="/portfolio">Portfolio</a>
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<a href="/propose">
						<Plus /> Propose a market
					</a>
				</DropdownMenuItem>
				{me?.isAdmin && (
					<DropdownMenuItem asChild>
						<a href="/admin">
							<ShieldCheck /> Admin
						</a>
					</DropdownMenuItem>
				)}
				<DropdownMenuSeparator />
				<DropdownMenuItem
					variant="destructive"
					onClick={() => {
						signOut().catch((err) => {
							toast.error("Sign-out failed", {
								description: err instanceof Error ? err.message : String(err),
							});
						});
					}}
				>
					<LogOut /> Sign out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function AuthControls() {
	return (
		<>
			<Authenticated>
				<UserMenu />
			</Authenticated>
			<Unauthenticated>
				<SignInButton className="hidden md:inline-flex" />
			</Unauthenticated>
		</>
	);
}
