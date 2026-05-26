import { ConvexAuthProvider } from "@convex-dev/auth/react";
import {
	createRootRoute,
	HeadContent,
	Link,
	Outlet,
	Scripts,
	useRouterState,
} from "@tanstack/react-router";
import { lazy, type ReactNode, Suspense, useEffect } from "react";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { TableRegistryProvider } from "@/components/table-devtools";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { convex } from "@/lib/convex";
import { trackPath } from "@/lib/route-history";
import appCss from "@/styles/global.css?url";

function RouteTracker() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	useEffect(() => {
		trackPath(pathname);
	}, [pathname]);
	return null;
}

const Devtools = import.meta.env.DEV
	? lazy(() =>
			Promise.all([
				import("@tanstack/react-devtools"),
				import("@tanstack/react-router-devtools"),
				import("@/components/table-devtools"),
			]).then(([{ TanStackDevtools }, router, tableDevtools]) => ({
				default: () => (
					<TanStackDevtools
						config={{ position: "bottom-right" }}
						plugins={[
							{
								name: "TanStack Router",
								render: <router.TanStackRouterDevtoolsPanel />,
							},
							{
								name: "TanStack Table",
								render: <tableDevtools.TableDevtoolsPanel />,
							},
						]}
					/>
				),
			}))
		)
	: null;

const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    var theme = stored || 'dark';
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

// Hard-reload once when a code-split chunk fails to load (stale deploy after
// a new release). The session-storage flag prevents an infinite reload loop
// if the chunk really is broken and not just a hash mismatch.
const chunkErrorRecoveryScript = `
(function() {
  var KEY = '__cm_chunk_reload_at';
  function recover(reason) {
    try {
      var last = Number(sessionStorage.getItem(KEY) || '0');
      if (Date.now() - last < 10000) return;
      sessionStorage.setItem(KEY, String(Date.now()));
    } catch (e) {}
    if (typeof console !== 'undefined') {
      console.warn('[charlesmarket] chunk load failed, hard-reloading:', reason);
    }
    window.location.reload();
  }
  window.addEventListener('vite:preloadError', function (e) {
    e.preventDefault();
    recover('vite:preloadError');
  });
  window.addEventListener('error', function (e) {
    var msg = e && e.message ? String(e.message) : '';
    if (
      msg.indexOf('Failed to fetch dynamically imported module') !== -1 ||
      msg.indexOf('Importing a module script failed') !== -1 ||
      (msg.indexOf('ChunkLoadError') !== -1)
    ) {
      recover('window.error');
    }
  });
  window.addEventListener('unhandledrejection', function (e) {
    var msg = (e && e.reason && (e.reason.message || String(e.reason))) || '';
    if (
      msg.indexOf('Failed to fetch dynamically imported module') !== -1 ||
      msg.indexOf('Importing a module script failed') !== -1 ||
      msg.indexOf('ChunkLoadError') !== -1
    ) {
      recover('unhandledrejection');
    }
  });
})();
`;

const SITE_URL = "https://charles.market";
const SITE_NAME = "CHARLES.MARKET";
const DEFAULT_TITLE = "CHARLES.MARKET · Bet on the people you know";
const DEFAULT_DESCRIPTION =
	"Play-money prediction console for the friends you know. Anyone publishes a Yes/No ticket about another user; the room sets the line in shekels.";
const OG_IMAGE = `${SITE_URL}/og.svg`;

const structuredData = {
	"@context": "https://schema.org",
	"@graph": [
		{
			"@type": "WebSite",
			"@id": `${SITE_URL}/#website`,
			url: `${SITE_URL}/`,
			name: SITE_NAME,
			description: DEFAULT_DESCRIPTION,
			inLanguage: "en",
			potentialAction: {
				"@type": "SearchAction",
				target: {
					"@type": "EntryPoint",
					urlTemplate: `${SITE_URL}/tickets?q={search_term_string}`,
				},
				"query-input": "required name=search_term_string",
			},
		},
		{
			"@type": "Organization",
			"@id": `${SITE_URL}/#org`,
			name: SITE_NAME,
			url: `${SITE_URL}/`,
			logo: `${SITE_URL}/favicon.svg`,
		},
	],
};

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1, viewport-fit=cover",
			},
			{ title: DEFAULT_TITLE },
			{ name: "description", content: DEFAULT_DESCRIPTION },
			{
				name: "keywords",
				content:
					"prediction ticket, play-money, friends, betting, Yes/No tickets, shekels, prediction console, Charles, social bets, ticket for friends",
			},
			{ name: "application-name", content: SITE_NAME },
			{ name: "apple-mobile-web-app-title", content: SITE_NAME },
			{ name: "apple-mobile-web-app-capable", content: "yes" },
			{
				name: "apple-mobile-web-app-status-bar-style",
				content: "black-translucent",
			},
			{ name: "format-detection", content: "telephone=no" },
			{ name: "theme-color", content: "#bcf03d" },
			{ name: "color-scheme", content: "dark light" },
			{
				name: "robots",
				content:
					"index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
			},
			{ name: "googlebot", content: "index, follow" },
			{ name: "referrer", content: "strict-origin-when-cross-origin" },
			{ name: "author", content: SITE_NAME },
			{ name: "creator", content: SITE_NAME },
			{ name: "publisher", content: SITE_NAME },
			{ property: "og:title", content: DEFAULT_TITLE },
			{ property: "og:description", content: DEFAULT_DESCRIPTION },
			{ property: "og:type", content: "website" },
			{ property: "og:site_name", content: SITE_NAME },
			{ property: "og:url", content: `${SITE_URL}/` },
			{ property: "og:locale", content: "en_US" },
			{ property: "og:image", content: OG_IMAGE },
			{ property: "og:image:type", content: "image/svg+xml" },
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
			{
				property: "og:image:alt",
				content: "CHARLES.MARKET · bet on the people you know in shekels",
			},
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: DEFAULT_TITLE },
			{ name: "twitter:description", content: DEFAULT_DESCRIPTION },
			{ name: "twitter:image", content: OG_IMAGE },
			{
				name: "twitter:image:alt",
				content: "CHARLES.MARKET · bet on the people you know in shekels",
			},
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
			{ rel: "alternate icon", href: "/favicon.svg" },
			{ rel: "mask-icon", href: "/favicon.svg", color: "#bcf03d" },
			{ rel: "apple-touch-icon", href: "/favicon.svg" },
			{ rel: "manifest", href: "/site.webmanifest" },
			{ rel: "canonical", href: `${SITE_URL}/` },
			{ rel: "preconnect", href: "https://fonts.googleapis.com" },
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous",
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Funnel+Display:wght@300..800&family=Funnel+Sans:ital,wght@0,300..800;1,300..800&family=JetBrains+Mono:wght@500;700&display=swap",
			},
		],
		scripts: [
			{ children: themeInitScript },
			{ children: chunkErrorRecoveryScript },
			{
				type: "application/ld+json",
				children: JSON.stringify(structuredData),
			},
		],
	}),
	shellComponent: RootDocument,
	notFoundComponent: GlobalNotFound,
	errorComponent: GlobalError,
});

function RootDocument({ children }: { children: ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body className="flex min-h-screen flex-col font-sans">
				<TableRegistryProvider>
					<ConvexAuthProvider client={convex}>
						<RouteTracker />
						<a
							href="#main-content"
							className="absolute top-0 left-2 z-50 -translate-y-full rounded-[4px] bg-brand px-3 py-1.5 font-mono font-semibold text-brand-foreground text-xs uppercase tracking-widest focus:top-2 focus:translate-y-0"
						>
							Skip to content
						</a>
						<Header />
						<div id="main-content" className="flex flex-1 flex-col">
							{children}
						</div>
						<Footer />
						<Toaster richColors closeButton position="bottom-right" />
					</ConvexAuthProvider>
					{Devtools && (
						<Suspense fallback={null}>
							<Devtools />
						</Suspense>
					)}
				</TableRegistryProvider>
				<Scripts />
			</body>
		</html>
	);
}

function isChunkLoadError(error: Error): boolean {
	const msg = error?.message ?? "";
	return (
		msg.includes("Failed to fetch dynamically imported module") ||
		msg.includes("Importing a module script failed") ||
		msg.includes("ChunkLoadError") ||
		error?.name === "ChunkLoadError"
	);
}

function GlobalError({ error }: { error: Error }) {
	const chunkError = isChunkLoadError(error);

	useEffect(() => {
		if (!chunkError || typeof window === "undefined") return;
		const KEY = "__cm_chunk_reload_at";
		let last = 0;
		try {
			last = Number(sessionStorage.getItem(KEY) || "0");
			sessionStorage.setItem(KEY, String(Date.now()));
		} catch {}
		if (Date.now() - last < 10_000) return;
		window.location.reload();
	}, [chunkError]);

	if (chunkError) {
		return (
			<main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
				<div className="bracket-chip" data-pulse="true">
					RELOADING
				</div>
				<h1 className="display-headline mt-6 text-4xl sm:text-5xl">
					New version is live.
				</h1>
				<p className="mt-4 max-w-md text-bone-2">
					Refreshing to pick up the latest build…
				</p>
				<Button className="mt-8" onClick={() => window.location.reload()}>
					Reload now
				</Button>
			</main>
		);
	}

	return (
		<main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
			<div className="bracket-chip" data-tone="danger">
				FAULT / UNHANDLED
			</div>
			<h1 className="display-headline mt-6 text-5xl sm:text-7xl">
				The console crashed.
			</h1>
			<p className="mt-4 max-w-lg text-bone-2">
				Something blew up rendering this page. Probably Charles's fault. Try
				reloading; if it keeps happening, head back to tickets.
			</p>
			<pre className="mt-6 max-w-xl overflow-x-auto border border-rule bg-ink-2 p-3 text-left font-mono text-[11px] text-magenta">
				{error.message}
			</pre>
			<div className="mt-8 flex gap-3">
				<Button onClick={() => window.location.reload()}>Reload</Button>
				<Button asChild variant="outline">
					<Link to="/tickets">Browse tickets</Link>
				</Button>
			</div>
		</main>
	);
}

function GlobalNotFound() {
	return (
		<main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
			<div className="bracket-chip" data-tone="danger">
				404 / NOT FOUND
			</div>
			<h1 className="display-headline mt-6 text-5xl sm:text-7xl">
				Charles lost it.
			</h1>
			<p className="mt-4 max-w-md text-bone-2">
				That page does not exist, or Charles forgot where he put it. Either way,
				back to tickets.
			</p>
			<div className="mt-8 flex gap-3">
				<Button asChild>
					<Link to="/tickets">Browse tickets</Link>
				</Button>
				<Button asChild variant="outline">
					<Link to="/">Go home</Link>
				</Button>
			</div>
		</main>
	);
}

export function RootComponent() {
	return <Outlet />;
}
