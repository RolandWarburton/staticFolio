const fetch = require("node-fetch");
const signPayload = require("./signPayload");
const debug = require("debug")("staticFolio:breadCrumbs");
const { URLSearchParams } = require("url");

const getPage = async (websitePath) => {
	const body = {
		websitePath: websitePath,
		uuid: "some uuid here",
	};

	const sig = signPayload(body);

	const headers = {
		Authorization: "Bearer 3imim8awgeq99ikbmg14lnqe0fu8",
		"x-payload-signature": sig,
	};

	const url = `${process.env.WATCHER_IP}/page?websitePath=${websitePath}`;

	return fetch(url, {
		method: "get",
		headers: headers,
	});
};

const getBreadcrumbs = async (websitePath) => {
	const webPathArray = websitePath.split("/").filter(String);
	const result = [];

	// use this to resolve all the fetch jobs
	const jobs = [];

	// build the webpath up again
	let webpathCurrentURL = "";

	// get the first page which is not included in the webPathArray
	const home = await (await getPage("/")).json();
	home.pageName = "~";
	jobs.push(result.push(home));

	// loop through the rest of the segments in the websitePath and get their pages
	// each time append the segment to the other ones to follow build the path
	for (segment of webPathArray) {
		webpathCurrentURL = `${webpathCurrentURL}/${segment}`;
		// debug(`looking for ${webpathCurrentURL}`);
		const page = await getPage(webpathCurrentURL);
		result.push(await page.json());

		// track concurrent jobs to resolve later
		jobs.push(page);
	}

	// resolve all the page queries
	await Promise.all(jobs);
	return result;
};

module.exports = getBreadcrumbs;
