/**
 * Shared API helpers for client-side code.
 */

const API_BASE = "/_emdash/api/plugins/emdash-commerce";

export function getSessionId(): string {
	let sessionId = localStorage.getItem("emdash-commerce-session");
	if (!sessionId) {
		sessionId = crypto.randomUUID();
		localStorage.setItem("emdash-commerce-session", sessionId);
	}
	return sessionId;
}

export async function apiPost<T = unknown>(route: string, data: unknown): Promise<T> {
	const res = await fetch(`${API_BASE}/${route}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
	if (!res.ok) throw new Error(await res.text());
	return res.json();
}

export async function apiGet<T = unknown>(route: string, params?: Record<string, string>): Promise<T> {
	const url = new URL(`${API_BASE}/${route}`, window.location.origin);
	if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
	const res = await fetch(url.toString());
	if (!res.ok) throw new Error(await res.text());
	return res.json();
}
