import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/markets")({
	beforeLoad: ({ search }) => {
		throw redirect({ to: "/tickets", search: search as never });
	},
	component: () => null,
});
