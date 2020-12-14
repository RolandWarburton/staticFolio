const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const util = require("util");
const signPayload = require("../../build/signPayload");
const renderSass = require("../../build/renderSass");
const generateHtmlpage = require("../../build/generateHtmlPage");
const deletePage = require("../../build/deletePage");
const getHeadCommit = require("../../build/getHeadCommit");
const { minify } = require("terser");
const debug = require("debug")("staticFolio:BuildPageC");

const read = util.promisify(fs.readFile);
const copy = util.promisify(fs.copyFile);

/**
 * ! Redownload the page and get its page object back from the db
 * @param {String} id - ID of the page
 */
const refreshPage = async (id) => {
	// fetch the page fresh from blog watcher
	debug("requesting the page and DOWNLOADING IT AGAIN", id);
	// const body = {
	// 	_id: id,
	// };
	// const sig = signPayload(body);
	// const headers = {
	// 	Authorization: "Bearer 3imim8awgeq99ikbmg14lnqe0fu8",
	// 	"x-payload-signature": sig,
	// };

	debug("fetching...");
	let result = await fetch(`${process.env.WATCHER_IP}/build/${id}`, {
		method: "get",
	});
	if (result.status != 200) debug(result);
	result = await result.json();
	page = result.page;
	debug("returning page");
	return page;
};

/**
 * ! Just get the page object
 * @param {String} id - ID of the page
 */
const fetchPage = async (id) => {
	// fetch the page fresh from blog watcher
	debug("requesting the page OBJECT ONLY", id);
	const body = {
		_id: id,
	};
	const sig = signPayload(body);
	const headers = {
		Authorization: "Bearer 3imim8awgeq99ikbmg14lnqe0fu8",
		"x-payload-signature": sig,
	};

	let result = await fetch(`${process.env.WATCHER_IP}/page?_id=${id}`, {
		method: "post",
		headers: headers,
		body: new URLSearchParams(body),
	});
	return await result.json();
};

const buildPage = async (req, res) => {
	debug(`building page ${req.params.id}`);

	const head = await getHeadCommit();

	if (!head) {
		return res.status(500).json({
			success: false,
			reason: "there was nothing in the github head",
		});
	}

	// Get the page
	debug("downloading the page");
	let page = await refreshPage(req.params.id);
	debug(page);
	debug("received page");

	if (!page) {
		return res.status(400).json({
			success: false,
			message: `failed to rebuild page. It likely didnt exist or it was hidden`,
		});
	}

	// TODO put this in a seperate function
	debug("writing scripts");
	let index = fs.readFileSync(
		path.resolve(process.env.ROOT, "scripts/index.js"),
		"utf-8"
	);
	index = await minify(index);
	fs.writeFileSync(
		path.resolve(process.env.ROOT, "dist/index.js"),
		index.code,
		{
			encoding: "utf8",
			flag: "w",
		}
	);

	let gist = fs.readFileSync(
		path.resolve(process.env.ROOT, "scripts/gist.js"),
		"utf-8"
	);
	gist = await minify(gist);
	fs.writeFileSync(
		path.resolve(process.env.ROOT, "dist/gist.js"),
		gist.code,
		{
			encoding: "utf8",
			flag: "w",
		}
	);

	// copy media to dist
	debug("copying media to dist");
	const mediaSrcPath = path.resolve(process.env.ROOT, "src/media");
	const mediaDistPath = path.resolve(process.env.ROOT, "dist/media");

	if (!fs.existsSync(mediaDistPath)) fs.mkdirSync(mediaDistPath);
	for (f of fs.readdirSync(mediaSrcPath)) {
		copy(`${mediaSrcPath}/${f}`, `${mediaDistPath}/${f}`);
	}

	// ! this is a temp holdover from build() all pages
	// TODO seperate this into its own function or something
	renderSass("src/styles/dark.scss", "dist/dark.css");
	renderSass("src/styles/light.scss", "dist/light.css");
	renderSass("src/styles/blue.scss", "dist/blue.css");
	renderSass("src/styles/gist.scss", "dist/gist.css");
	renderSass("src/styles/home.scss", "dist/home.css");
	renderSass("src/styles/menu.scss", "dist/menu.css");

	debug("reading the file", page._id);
	let outputMarkdown = await read(`content/${page._id}.md`, "utf8");

	// now try and build it and write it to dist
	try {
		debug("trying to generate html");
		generateHtmlpage(outputMarkdown, { ...page, head: head }).then(() => {
			debug(`finished building page ${page._id}.`);
		});

		return res.status(200).json({ success: true });
	} catch (err) {
		debug(`error building page ${page._id}! ${err}`);
		return res.status(500).json({
			success: false,
			message: `failed to rebuild single page ${page._id}`,
		});
	}
};

module.exports = buildPage;
