export default async (_id) => {
	const url = `https://api.blog.rolandw.dev/api/v1/watch/history/find/${_id}`;

	console.log(`fetching items /history/find/${_id}`);
	return fetch(url, { method: "get" });
};
