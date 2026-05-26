import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { STARTING_BALANCE } from "./tickets";

export { STARTING_BALANCE };

export function useBalance() {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const balanceQuery = useQuery(api.wallet.get, isAuthenticated ? {} : "skip");

	const balance = balanceQuery ?? STARTING_BALANCE;
	const mounted =
		!isLoading && (balanceQuery !== undefined || !isAuthenticated);

	return {
		balance,
		mounted,
		isAuthenticated,
		isLoading,
	};
}
