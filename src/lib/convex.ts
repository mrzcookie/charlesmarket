import { ConvexReactClient } from "convex/react";

const url = import.meta.env.VITE_CONVEX_URL as string | undefined;

if (!url && typeof window !== "undefined") {
	// eslint-disable-next-line no-console
	console.warn(
		"[charlesmarket] VITE_CONVEX_URL is not set — Convex queries will not connect. Run `npx convex dev` and copy the URL into .env.local."
	);
}

export const convex = new ConvexReactClient(
	url ?? "https://placeholder.convex.cloud"
);

export const isConvexConfigured = Boolean(url);
