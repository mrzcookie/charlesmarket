import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { STARTING_BALANCE } from "./markets";

export { STARTING_BALANCE };

export function useBalance() {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const balanceQuery = useQuery(api.wallet.get, isAuthenticated ? {} : "skip");
	const topUp = useMutation(api.wallet.topUp);
	const reset = useMutation(api.wallet.reset);

	const balance = balanceQuery ?? STARTING_BALANCE;
	const mounted =
		!isLoading && (balanceQuery !== undefined || !isAuthenticated);

	return {
		balance,
		mounted,
		isAuthenticated,
		isLoading,
		topUp: (amount: number) => topUp({ amount }),
		reset: () => reset({}),
	};
}
