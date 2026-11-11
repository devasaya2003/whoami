export async function api<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(path, {
		...init,
		headers: {
			...(init?.body instanceof FormData
				? {}
				: { "content-type": "application/json" }),
			...init?.headers,
		},
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(text || res.statusText);
	}
	if (res.status === 204) return undefined as T;
	return (await res.json()) as T;
}
