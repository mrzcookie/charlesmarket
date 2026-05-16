import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/markets")({
	beforeLoad: () => {
		throw redirect({ to: "/admin/tickets" });
	},
	component: () => null,
});
