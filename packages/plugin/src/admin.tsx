/**
 * Admin UI for the commerce plugin.
 *
 * Uses @cloudflare/kumo components and Tailwind classes to match the emdash admin style.
 * Products and categories are managed in the native emdash content admin.
 */

import { Badge, Button, Dialog, Input, Loader, Select } from "@cloudflare/kumo";
import {
	ArrowLeft,
	ChartBar,
	CurrencyDollar,
	Package,
	Plus,
	Receipt,
	ShoppingCart,
	Tag,
	Trash,
	Users,
	Gear,
	TrendUp,
	Clock,
	Warning,
} from "@phosphor-icons/react";
import { apiFetch as baseFetch, parseApiResponse } from "emdash/plugin-utils";
import * as React from "react";

// ─── API Helper ──────────────────────────────────────────────────

const API = "/_emdash/api/plugins/emdash-commerce";

async function apiFetch<T = unknown>(route: string, body?: unknown): Promise<T> {
	const res = await baseFetch(`${API}/${route}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body ?? {}),
	});
	return parseApiResponse<T>(res, `Request to ${route} failed`);
}

function formatPrice(cents: number, currency: string = "USD"): string {
	return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Confirm Dialog ──────────────────────────────────────────────

function ConfirmDialog({
	open,
	onClose,
	title,
	description,
	confirmLabel = "Delete",
	pendingLabel = "Deleting...",
	isPending,
	error,
	onConfirm,
}: {
	open: boolean;
	onClose: () => void;
	title: string;
	description: React.ReactNode;
	confirmLabel?: string;
	pendingLabel?: string;
	isPending: boolean;
	error: string | null;
	onConfirm: () => void;
}) {
	return (
		<Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
			<Dialog className="p-6" size="sm">
				<Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
				<Dialog.Description className="text-muted-foreground">{description}</Dialog.Description>
				{error && (
					<div className="mt-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
				)}
				<div className="mt-6 flex justify-end gap-2">
					<Button variant="secondary" onClick={onClose}>Cancel</Button>
					<Button variant="destructive" disabled={isPending} onClick={onConfirm}>
						{isPending ? pendingLabel : confirmLabel}
					</Button>
				</div>
			</Dialog>
		</Dialog.Root>
	);
}

function useConfirmDelete(deleteFn: (id: string) => Promise<void>) {
	const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; label: string } | null>(null);
	const [deleting, setDeleting] = React.useState(false);
	const [deleteError, setDeleteError] = React.useState<string | null>(null);

	const requestDelete = (id: string, label: string) => {
		setDeleteTarget({ id, label });
		setDeleteError(null);
	};

	const confirmDelete = async () => {
		if (!deleteTarget) return;
		setDeleting(true);
		setDeleteError(null);
		try {
			await deleteFn(deleteTarget.id);
			setDeleteTarget(null);
		} catch (e: any) {
			setDeleteError(e.message || "Failed to delete");
		} finally {
			setDeleting(false);
		}
	};

	const cancelDelete = () => {
		setDeleteTarget(null);
		setDeleteError(null);
	};

	return { deleteTarget, deleting, deleteError, requestDelete, confirmDelete, cancelDelete };
}

// ─── Shared Components ───────────────────────────────────────────

function EmptyState({ icon: Icon, title, description }: { icon: React.ComponentType<any>; title: string; description: string }) {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-center">
			<Icon className="h-12 w-12 text-muted-foreground/50 mb-4" />
			<h3 className="text-lg font-medium mb-1">{title}</h3>
			<p className="text-sm text-muted-foreground">{description}</p>
		</div>
	);
}

function PageHeader({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
	return (
		<div className="flex items-center justify-between mb-6">
			<div>
				<h1 className="text-3xl font-bold">{title}</h1>
				{description && <p className="text-muted-foreground mt-1">{description}</p>}
			</div>
			{children}
		</div>
	);
}

function StatCard({ icon: Icon, label, value, subtext }: { icon: React.ComponentType<any>; label: string; value: string | number; subtext?: string }) {
	return (
		<div className="border rounded-lg p-4 bg-card">
			<div className="flex items-center gap-2 text-muted-foreground mb-2">
				<Icon className="h-4 w-4" />
				<span className="text-sm font-medium">{label}</span>
			</div>
			<div className="text-2xl font-bold">{value}</div>
			{subtext && <div className="text-xs text-muted-foreground mt-1">{subtext}</div>}
		</div>
	);
}

// ─── Dashboard Page ──────────────────────────────────────────────

function DashboardPage() {
	const [overview, setOverview] = React.useState<any>(null);
	const [topProducts, setTopProducts] = React.useState<any>(null);
	const [loading, setLoading] = React.useState(true);

	React.useEffect(() => {
		Promise.all([
			apiFetch("reports/overview"),
			apiFetch("reports/top-products", { limit: 5 }),
		]).then(([o, t]) => {
			setOverview(o);
			setTopProducts(t);
			setLoading(false);
		}).catch(() => setLoading(false));
	}, []);

	if (loading) return <div className="flex items-center justify-center py-16"><Loader /></div>;
	if (!overview) return <EmptyState icon={ChartBar} title="No data yet" description="Data will appear once you start receiving orders." />;

	return (
		<div className="space-y-6">
			<PageHeader title="Commerce Dashboard" description="Overview of your store performance" />

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<StatCard icon={CurrencyDollar} label="Revenue" value={formatPrice(overview.totalRevenue, overview.currency)} subtext={`${overview.paidOrders} paid orders`} />
				<StatCard icon={ShoppingCart} label="Total Orders" value={overview.totalOrders} />
				<StatCard icon={TrendUp} label="Avg. Order Value" value={formatPrice(overview.averageOrderValue, overview.currency)} />
				<StatCard icon={Clock} label="Pending" value={overview.pendingOrders} subtext="orders awaiting action" />
			</div>

			{topProducts?.items?.length > 0 && (
				<div className="border rounded-lg overflow-hidden">
					<div className="p-4 border-b bg-muted/50">
						<h2 className="font-semibold">Top Products</h2>
					</div>
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b bg-muted/30">
								<th className="text-left p-3 font-medium">Product</th>
								<th className="text-right p-3 font-medium">Units Sold</th>
								<th className="text-right p-3 font-medium">Revenue</th>
							</tr>
						</thead>
						<tbody>
							{topProducts.items.map((p: any) => (
								<tr key={p.productId} className="border-b last:border-0 hover:bg-muted/20">
									<td className="p-3 font-medium">{p.name}</td>
									<td className="p-3 text-right tabular-nums">{p.quantity}</td>
									<td className="p-3 text-right tabular-nums">{formatPrice(p.revenue, overview.currency)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

// ─── Orders Page ─────────────────────────────────────────────────

function OrdersPage() {
	const [orders, setOrders] = React.useState<any[]>([]);
	const [loading, setLoading] = React.useState(true);

	React.useEffect(() => {
		apiFetch<any>("orders/list").then((r) => { setOrders(r.items); setLoading(false); }).catch(() => setLoading(false));
	}, []);

	if (loading) return <div className="flex items-center justify-center py-16"><Loader /></div>;

	return (
		<div className="space-y-6">
			<PageHeader title="Orders" description="Manage customer orders" />

			{orders.length === 0 ? (
				<EmptyState icon={Receipt} title="No orders yet" description="Orders will appear here when customers complete checkout." />
			) : (
				<div className="border rounded-lg overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b bg-muted/50">
								<th className="text-left p-3 font-medium">Order #</th>
								<th className="text-left p-3 font-medium">Status</th>
								<th className="text-left p-3 font-medium">Payment</th>
								<th className="text-right p-3 font-medium">Total</th>
								<th className="text-left p-3 font-medium">Date</th>
							</tr>
						</thead>
						<tbody>
							{orders.map((o) => (
								<tr key={o.id} className="border-b last:border-0 hover:bg-muted/30">
									<td className="p-3 font-medium font-mono text-xs">{o.orderNumber}</td>
									<td className="p-3"><Badge variant={o.status === "delivered" ? "success" : o.status === "cancelled" ? "destructive" : "secondary"}>{o.status}</Badge></td>
									<td className="p-3"><Badge variant={o.paymentStatus === "paid" ? "success" : o.paymentStatus === "failed" ? "destructive" : "warning"}>{o.paymentStatus}</Badge></td>
									<td className="p-3 text-right tabular-nums font-medium">{formatPrice(o.total, o.currency)}</td>
									<td className="p-3 text-muted-foreground">{formatDate(o.createdAt)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

// ─── Customers Page ──────────────────────────────────────────────

function CustomersPage() {
	const [customers, setCustomers] = React.useState<any[]>([]);
	const [loading, setLoading] = React.useState(true);

	React.useEffect(() => {
		apiFetch<any>("customers/list").then((r) => { setCustomers(r.items); setLoading(false); }).catch(() => setLoading(false));
	}, []);

	if (loading) return <div className="flex items-center justify-center py-16"><Loader /></div>;

	return (
		<div className="space-y-6">
			<PageHeader title="Customers" description="View and manage your customers" />

			{customers.length === 0 ? (
				<EmptyState icon={Users} title="No customers yet" description="Customers are created automatically when orders are placed." />
			) : (
				<div className="border rounded-lg overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b bg-muted/50">
								<th className="text-left p-3 font-medium">Email</th>
								<th className="text-left p-3 font-medium">Name</th>
								<th className="text-right p-3 font-medium">Orders</th>
								<th className="text-right p-3 font-medium">Total Spent</th>
							</tr>
						</thead>
						<tbody>
							{customers.map((c) => (
								<tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
									<td className="p-3 font-medium">{c.email}</td>
									<td className="p-3 text-muted-foreground">{[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"}</td>
									<td className="p-3 text-right tabular-nums">{c.orderCount}</td>
									<td className="p-3 text-right tabular-nums font-medium">{formatPrice(c.totalSpent)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

// ─── Discounts Page ──────────────────────────────────────────────

const SCOPE_ITEMS = [
	{ label: "Entire Order", value: "order" },
	{ label: "Specific Products", value: "products" },
	{ label: "Specific Categories", value: "categories" },
];

function DiscountFormDialog({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: () => void }) {
	const [code, setCode] = React.useState("");
	const [type, setType] = React.useState("percentage");
	const [value, setValue] = React.useState("");
	const [scope, setScope] = React.useState("order");
	const [maxUses, setMaxUses] = React.useState("");
	const [minOrderAmount, setMinOrderAmount] = React.useState("");
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState("");

	const handleSave = async () => {
		if (!code || !value) { setError("Code and value are required"); return; }
		setSaving(true);
		setError("");
		try {
			await apiFetch("discounts/create", {
				code: code.toUpperCase(), type, value: Number(value), scope,
				maxUses: maxUses ? Number(maxUses) : 0,
				minOrderAmount: minOrderAmount ? Number(minOrderAmount) : undefined,
			});
			onSave();
		} catch (e: any) {
			setError(e.message || "Failed to create discount");
		} finally { setSaving(false); }
	};

	return (
		<Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
			<Dialog className="p-6" size="sm">
				<Dialog.Title className="text-lg font-semibold">New Discount Code</Dialog.Title>
				<Dialog.Description className="text-muted-foreground">Create a coupon code customers can apply at checkout.</Dialog.Description>
				{error && <div className="mt-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
				<div className="mt-5 space-y-4">
					<Input label="Code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="SUMMER20" />
					<Select label="Type" value={type} onValueChange={(v) => setType(v ?? "percentage")} items={[
						{ label: "Percentage", value: "percentage" },
						{ label: "Fixed Amount (cents)", value: "fixed_amount" },
						{ label: "Free Shipping", value: "free_shipping" },
					]} />
					<Input label={type === "percentage" ? "Discount (%)" : "Amount (cents)"} type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder={type === "percentage" ? "20" : "1000"} />
					<Select label="Applies To" value={scope} onValueChange={(v) => setScope(v ?? "order")} items={SCOPE_ITEMS} />
					<div className="grid grid-cols-2 gap-4">
						<Input label="Max Uses" description="0 = unlimited" type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="0" />
						<Input label="Min Order (cents)" type="number" value={minOrderAmount} onChange={(e) => setMinOrderAmount(e.target.value)} placeholder="0" />
					</div>
				</div>
				<div className="mt-6 flex justify-end gap-2">
					<Button variant="secondary" onClick={onClose}>Cancel</Button>
					<Button disabled={saving} onClick={handleSave}>{saving ? "Creating..." : "Create Discount"}</Button>
				</div>
			</Dialog>
		</Dialog.Root>
	);
}

function PriceRuleFormDialog({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: () => void }) {
	const [name, setName] = React.useState("");
	const [type, setType] = React.useState("percentage");
	const [value, setValue] = React.useState("");
	const [scope, setScope] = React.useState("order");
	const [priority, setPriority] = React.useState("100");
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState("");

	const handleSave = async () => {
		if (!name) { setError("Name is required"); return; }
		setSaving(true);
		setError("");
		try {
			await apiFetch("price-rules/create", {
				name, type, value: value ? Number(value) : undefined, scope, priority: Number(priority),
			});
			onSave();
		} catch (e: any) {
			setError(e.message || "Failed to create price rule");
		} finally { setSaving(false); }
	};

	return (
		<Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
			<Dialog className="p-6" size="sm">
				<Dialog.Title className="text-lg font-semibold">New Price Rule</Dialog.Title>
				<Dialog.Description className="text-muted-foreground">Create an automatic pricing rule applied at checkout.</Dialog.Description>
				{error && <div className="mt-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
				<div className="mt-5 space-y-4">
					<Input label="Rule Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Summer Sale 20% Off" />
					<Select label="Rule Type" value={type} onValueChange={(v) => setType(v ?? "percentage")} items={[
						{ label: "Percentage Off", value: "percentage" },
						{ label: "Fixed Amount Off", value: "fixed_amount" },
						{ label: "Tiered / Volume", value: "tiered" },
						{ label: "Buy One Get One", value: "bogo" },
					]} />
					{(type === "percentage" || type === "fixed_amount") && (
						<Input label={type === "percentage" ? "Discount (%)" : "Amount (cents)"} type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder={type === "percentage" ? "20" : "1000"} />
					)}
					<Select label="Applies To" value={scope} onValueChange={(v) => setScope(v ?? "order")} items={SCOPE_ITEMS} />
					<Input label="Priority" description="Lower number runs first" type="number" value={priority} onChange={(e) => setPriority(e.target.value)} placeholder="100" />
				</div>
				<div className="mt-6 flex justify-end gap-2">
					<Button variant="secondary" onClick={onClose}>Cancel</Button>
					<Button disabled={saving} onClick={handleSave}>{saving ? "Creating..." : "Create Rule"}</Button>
				</div>
			</Dialog>
		</Dialog.Root>
	);
}

function DiscountsPage() {
	const [discounts, setDiscounts] = React.useState<any[]>([]);
	const [priceRules, setPriceRules] = React.useState<any[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [creatingDiscount, setCreatingDiscount] = React.useState(false);
	const [creatingRule, setCreatingRule] = React.useState(false);

	const loadData = React.useCallback(() => {
		setLoading(true);
		Promise.all([apiFetch<any>("discounts/list"), apiFetch<any>("price-rules/list")]).then(([d, r]) => {
			setDiscounts(d.items); setPriceRules(r.items); setLoading(false);
		}).catch(() => setLoading(false));
	}, []);

	React.useEffect(() => { loadData(); }, [loadData]);

	const discountDelete = useConfirmDelete(async (id) => {
		await apiFetch("discounts/delete", { id });
		loadData();
	});

	const ruleDelete = useConfirmDelete(async (id) => {
		await apiFetch("price-rules/delete", { id });
		loadData();
	});

	if (loading) return <div className="flex items-center justify-center py-16"><Loader /></div>;

	return (
		<div className="space-y-8">
			<PageHeader title="Discounts & Price Rules" description="Manage discount codes and automatic pricing rules" />

			{/* Discount Codes */}
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold">Discount Codes</h2>
					{!creatingDiscount && (
						<Button icon={<Plus />} onClick={() => setCreatingDiscount(true)}>New Discount</Button>
					)}
				</div>

				{creatingDiscount && (
					<DiscountFormDialog
						open={creatingDiscount}
						onClose={() => setCreatingDiscount(false)}
						onSave={() => { setCreatingDiscount(false); loadData(); }}
					/>
				)}

				{discounts.length === 0 ? (
					<div className="border border-dashed rounded-lg p-8 text-center text-sm text-muted-foreground">
						No discount codes yet. Click "New Discount" to create one.
					</div>
				) : discounts.length > 0 && (
					<div className="border rounded-lg overflow-x-auto">
						<table className="w-full text-sm table-fixed">
							<thead>
								<tr className="border-b bg-muted/50">
									<th className="text-left p-3 font-medium w-[20%]">Code</th>
									<th className="text-left p-3 font-medium w-[20%]">Type</th>
									<th className="text-right p-3 font-medium w-[15%]">Value</th>
									<th className="text-left p-3 font-medium w-[15%]">Status</th>
									<th className="text-right p-3 font-medium w-[15%]">Used</th>
									<th className="text-right p-3 font-medium w-[15%]">Actions</th>
								</tr>
							</thead>
							<tbody>
								{discounts.map((d) => (
									<tr key={d.id} className="border-b last:border-0 hover:bg-muted/30">
										<td className="p-3 font-mono text-xs font-medium">{d.code}</td>
										<td className="p-3 text-muted-foreground capitalize">{d.type.replace("_", " ")}</td>
										<td className="p-3 text-right tabular-nums">{d.type === "percentage" ? `${d.value}%` : formatPrice(d.value)}</td>
										<td className="p-3"><Badge variant={d.status === "active" ? "success" : d.status === "expired" ? "destructive" : "secondary"}>{d.status}</Badge></td>
										<td className="p-3 text-right tabular-nums">{d.usedCount}{d.maxUses > 0 ? ` / ${d.maxUses}` : ""}</td>
										<td className="p-3">
											<div className="flex justify-end">
												<Button variant="ghost" shape="square" onClick={() => discountDelete.requestDelete(d.id, d.code)} aria-label="Delete">
													<Trash className="h-4 w-4" />
												</Button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Price Rules */}
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold">Automatic Price Rules</h2>
					{!creatingRule && (
						<Button icon={<Plus />} onClick={() => setCreatingRule(true)}>New Rule</Button>
					)}
				</div>

				{creatingRule && (
					<PriceRuleFormDialog
						open={creatingRule}
						onClose={() => setCreatingRule(false)}
						onSave={() => { setCreatingRule(false); loadData(); }}
					/>
				)}

				{priceRules.length === 0 ? (
					<div className="border border-dashed rounded-lg p-8 text-center text-sm text-muted-foreground">
						No price rules yet. Click "New Rule" to create one.
					</div>
				) : priceRules.length > 0 && (
					<div className="border rounded-lg overflow-x-auto">
						<table className="w-full text-sm table-fixed">
							<thead>
								<tr className="border-b bg-muted/50">
									<th className="text-left p-3 font-medium w-[30%]">Name</th>
									<th className="text-left p-3 font-medium w-[18%]">Type</th>
									<th className="text-left p-3 font-medium w-[18%]">Scope</th>
									<th className="text-right p-3 font-medium w-[12%]">Priority</th>
									<th className="text-left p-3 font-medium w-[12%]">Status</th>
									<th className="text-right p-3 font-medium w-[10%]">Actions</th>
								</tr>
							</thead>
							<tbody>
								{priceRules.map((r) => (
									<tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
										<td className="p-3 font-medium">{r.name}</td>
										<td className="p-3 text-muted-foreground capitalize">{r.type.replace("_", " ")}</td>
										<td className="p-3 text-muted-foreground capitalize">{r.scope}</td>
										<td className="p-3 text-right tabular-nums">{r.priority}</td>
										<td className="p-3"><Badge variant={r.status === "active" ? "success" : "secondary"}>{r.status}</Badge></td>
										<td className="p-3">
											<div className="flex justify-end">
												<Button variant="ghost" shape="square" onClick={() => ruleDelete.requestDelete(r.id, r.name)} aria-label="Delete">
													<Trash className="h-4 w-4" />
												</Button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{discountDelete.deleteTarget && (
				<ConfirmDialog
					open
					onClose={discountDelete.cancelDelete}
					title="Delete Discount Code"
					description={<>Are you sure you want to delete <strong>{discountDelete.deleteTarget.label}</strong>? This action cannot be undone.</>}
					confirmLabel="Delete Discount"
					pendingLabel="Deleting..."
					isPending={discountDelete.deleting}
					error={discountDelete.deleteError}
					onConfirm={discountDelete.confirmDelete}
				/>
			)}

			{ruleDelete.deleteTarget && (
				<ConfirmDialog
					open
					onClose={ruleDelete.cancelDelete}
					title="Delete Price Rule"
					description={<>Are you sure you want to delete <strong>{ruleDelete.deleteTarget.label}</strong>? This action cannot be undone.</>}
					confirmLabel="Delete Rule"
					pendingLabel="Deleting..."
					isPending={ruleDelete.deleting}
					error={ruleDelete.deleteError}
					onConfirm={ruleDelete.confirmDelete}
				/>
			)}
		</div>
	);
}

// ─── Settings Page ───────────────────────────────────────────────

function SettingsPage() {
	return (
		<div className="space-y-6">
			<PageHeader title="Commerce Settings" description="Configure your store" />
			<div className="border rounded-lg p-6 bg-card">
				<div className="flex items-center gap-3 text-muted-foreground">
					<Gear className="h-5 w-5" />
					<p>Settings are managed through the plugin settings panel above.</p>
				</div>
			</div>
		</div>
	);
}

// ─── Dashboard Widgets ───────────────────────────────────────────

function RevenueSummaryWidget() {
	const [data, setData] = React.useState<any>(null);
	React.useEffect(() => { apiFetch("reports/overview").then(setData).catch(() => {}); }, []);
	if (!data) return <div className="flex items-center justify-center py-4"><Loader /></div>;
	return (
		<div>
			<div className="text-2xl font-bold">{formatPrice(data.totalRevenue, data.currency)}</div>
			<div className="text-sm text-muted-foreground mt-1">{data.paidOrders} paid orders</div>
		</div>
	);
}

function RecentOrdersWidget() {
	const [orders, setOrders] = React.useState<any[]>([]);
	React.useEffect(() => { apiFetch<any>("orders/list", { limit: 5 }).then((r) => setOrders(r.items)).catch(() => {}); }, []);
	if (orders.length === 0) return <p className="text-sm text-muted-foreground">No orders yet</p>;
	return (
		<div className="space-y-2">
			{orders.map((o) => (
				<div key={o.id} className="flex items-center justify-between text-sm">
					<span className="font-mono text-xs">{o.orderNumber}</span>
					<Badge variant={o.status === "delivered" ? "success" : "secondary"}>{o.status}</Badge>
					<span className="tabular-nums font-medium">{formatPrice(o.total, o.currency)}</span>
				</div>
			))}
		</div>
	);
}

function LowStockWidget() {
	return <p className="text-sm text-muted-foreground">Check products in Content &rarr; Products</p>;
}

function TopProductsWidget() {
	const [items, setItems] = React.useState<any[]>([]);
	React.useEffect(() => { apiFetch<any>("reports/top-products", { limit: 5 }).then((r) => setItems(r.items)).catch(() => {}); }, []);
	if (items.length === 0) return <p className="text-sm text-muted-foreground">No sales yet</p>;
	return (
		<div className="space-y-2">
			{items.map((p) => (
				<div key={p.productId} className="flex items-center justify-between text-sm">
					<span className="truncate">{p.name}</span>
					<span className="text-muted-foreground tabular-nums">{p.quantity} sold</span>
				</div>
			))}
		</div>
	);
}

// ─── Exports ─────────────────────────────────────────────────────

export const pages = {
	"/": DashboardPage,
	"/orders": OrdersPage,
	"/customers": CustomersPage,
	"/discounts": DiscountsPage,
	"/settings": SettingsPage,
};

export const widgets = {
	"revenue-summary": RevenueSummaryWidget,
	"recent-orders": RecentOrdersWidget,
	"low-stock": LowStockWidget,
	"top-products": TopProductsWidget,
};
