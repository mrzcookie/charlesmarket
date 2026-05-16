import type { Table } from "@tanstack/react-table";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useReducer,
	useRef,
} from "react";

type TableGetter = () => Table<unknown>;

type Registry = Map<string, TableGetter>;

type RegistryCtx = {
	register: (name: string, getter: TableGetter) => void;
	unregister: (name: string) => void;
	getAll: () => Registry;
};

const TableRegistryContext = createContext<RegistryCtx>({
	register: () => {},
	unregister: () => {},
	getAll: () => new Map(),
});

const registry: Registry = new Map();
const subscribers = new Set<() => void>();

function notifySubscribers() {
	for (const s of subscribers) s();
}

export function TableRegistryProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const register = useCallback((name: string, getter: TableGetter) => {
		registry.set(name, getter);
		notifySubscribers();
	}, []);

	const unregister = useCallback((name: string) => {
		registry.delete(name);
		notifySubscribers();
	}, []);

	const getAll = useCallback(() => registry, []);

	return (
		<TableRegistryContext.Provider value={{ register, unregister, getAll }}>
			{children}
		</TableRegistryContext.Provider>
	);
}

export function useRegisterTable<T>(name: string, table: Table<T>) {
	const { register, unregister } = useContext(TableRegistryContext);
	const tableRef = useRef(table);
	tableRef.current = table;

	useEffect(() => {
		register(name, () => tableRef.current as unknown as Table<unknown>);
		return () => unregister(name);
	}, [name, register, unregister]);
}

export function TableDevtoolsPanel() {
	const { getAll } = useContext(TableRegistryContext);
	const [, tick] = useReducer((n: number) => n + 1, 0);

	useEffect(() => {
		const id = setInterval(tick, 500);
		subscribers.add(tick);
		return () => {
			clearInterval(id);
			subscribers.delete(tick);
		};
	}, []);

	const tables = getAll();

	const containerStyle: React.CSSProperties = {
		padding: "12px 16px",
		height: "100%",
		overflowY: "auto",
		fontFamily: "monospace",
		fontSize: 12,
		color: "#d4d4d4",
	};

	const headingStyle: React.CSSProperties = {
		fontFamily: "sans-serif",
		fontWeight: 600,
		fontSize: 13,
		color: "#e5e5e5",
		marginBottom: 12,
	};

	const emptyStyle: React.CSSProperties = {
		color: "#666",
		fontFamily: "sans-serif",
		fontSize: 13,
		paddingTop: 24,
	};

	const tableBlockStyle: React.CSSProperties = {
		marginBottom: 20,
		border: "1px solid #2a2a2a",
		borderRadius: 6,
		overflow: "hidden",
	};

	const tableHeadStyle: React.CSSProperties = {
		background: "#1a1a1a",
		padding: "8px 12px",
		fontFamily: "sans-serif",
		fontWeight: 600,
		fontSize: 12,
		color: "#a3e635",
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
	};

	const tableBodyStyle: React.CSSProperties = {
		background: "#111",
		padding: "10px 12px",
	};

	const rowStyle: React.CSSProperties = {
		display: "flex",
		justifyContent: "space-between",
		padding: "3px 0",
		borderBottom: "1px solid #1f1f1f",
	};

	const labelStyle: React.CSSProperties = { color: "#888" };
	const valueStyle: React.CSSProperties = { color: "#d4d4d4" };

	return (
		<div style={containerStyle}>
			<p style={headingStyle}>TanStack Table Inspector</p>

			{tables.size === 0 ? (
				<p style={emptyStyle}>No active tables registered.</p>
			) : (
				[...tables.entries()].map(([name, getTable]) => {
					let t: Table<unknown>;
					try {
						t = getTable();
					} catch {
						return null;
					}
					const state = t.getState();
					const totalRows = t.getCoreRowModel().rows.length;
					const filteredRows = t.getFilteredRowModel().rows.length;
					const pageCount = t.getPageCount();
					const currentPage = state.pagination.pageIndex + 1;
					const sorting = state.sorting
						.map((s) => `${s.id} ${s.desc ? "↓" : "↑"}`)
						.join(", ");
					const filters = state.columnFilters
						.map((f) => `${f.id}=${JSON.stringify(f.value)}`)
						.join(", ");
					const globalFilter = String(state.globalFilter ?? "");

					return (
						<div key={name} style={tableBlockStyle}>
							<div style={tableHeadStyle}>
								<span>{name}</span>
								<span style={{ color: "#6b7280", fontWeight: 400 }}>
									{filteredRows}/{totalRows} rows
								</span>
							</div>
							<div style={tableBodyStyle}>
								<div style={rowStyle}>
									<span style={labelStyle}>total rows</span>
									<span style={valueStyle}>{totalRows}</span>
								</div>
								<div style={rowStyle}>
									<span style={labelStyle}>filtered rows</span>
									<span style={valueStyle}>{filteredRows}</span>
								</div>
								<div style={rowStyle}>
									<span style={labelStyle}>page</span>
									<span style={valueStyle}>
										{pageCount > 0 ? `${currentPage} / ${pageCount}` : "—"}
									</span>
								</div>
								<div style={rowStyle}>
									<span style={labelStyle}>page size</span>
									<span style={valueStyle}>
										{state.pagination.pageSize}
									</span>
								</div>
								<div style={rowStyle}>
									<span style={labelStyle}>sorting</span>
									<span style={valueStyle}>{sorting || "none"}</span>
								</div>
								{filters && (
									<div style={rowStyle}>
										<span style={labelStyle}>col filters</span>
										<span style={{ ...valueStyle, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
											{filters}
										</span>
									</div>
								)}
								{globalFilter && (
									<div style={rowStyle}>
										<span style={labelStyle}>global filter</span>
										<span style={valueStyle}>"{globalFilter}"</span>
									</div>
								)}
								<div style={{ ...rowStyle, borderBottom: "none" }}>
									<span style={labelStyle}>columns</span>
									<span style={valueStyle}>
										{t.getAllColumns().length}
									</span>
								</div>
							</div>
						</div>
					);
				})
			)}
		</div>
	);
}
