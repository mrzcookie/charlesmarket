// Module-level in-app navigation tracker. `RouteTracker` in __root.tsx feeds
// every pathname change here; consumers (like the profile breadcrumb) read the
// previous path to render a "where you came from" crumb that adapts to context.

let _prev: string | null = null;
let _curr: string | null = null;

export function trackPath(pathname: string) {
	if (_curr === pathname) return;
	_prev = _curr;
	_curr = pathname;
}

export function getPreviousPath(): string | null {
	return _prev;
}

export type ReferrerCrumb = {
	label: string;
	to: string;
};

const STATIC_LABELS: Record<string, string> = {
	"/": "Home",
	"/tickets": "Tickets",
	"/activity": "Activity",
	"/leaderboard": "Leaderboard",
	"/portfolio": "Portfolio",
	"/profile": "Profile",
	"/create": "New ticket",
	"/admin": "Admin",
	"/admin/tickets": "Admin · Tickets",
	"/admin/users": "Admin · Users",
};

/**
 * Map a previous pathname to a breadcrumb label + a target to link back to.
 * Falls back to Leaderboard if we don't have a usable referrer.
 */
export function crumbForPath(path: string | null): ReferrerCrumb {
	const fallback: ReferrerCrumb = { label: "Leaderboard", to: "/leaderboard" };
	if (!path) return fallback;

	if (STATIC_LABELS[path]) {
		return { label: STATIC_LABELS[path], to: path };
	}
	if (path.startsWith("/ticket/")) {
		return { label: "Ticket", to: path };
	}
	if (path.startsWith("/profile/")) {
		return { label: "Profile", to: path };
	}
	return fallback;
}
