const express = require("express");
const bodyParser = require("body-parser");
const buildRouter = require("./buildRouter");
const debug = require("debug")("staticFolio:routers");
const router = express.Router();

// controllers
const downloadPage = require("../controllers/downloadPage");
const downloadPages = require("../controllers/downloadPages");

// create application/x-www-form-urlencoded parser
const urlencodedParser = bodyParser.urlencoded({
	limit: "50mb",
	extended: true,
});

// Download requests contain a req.body.markdown
// which is used to write a markdown file in staticFolios content
const routes = [
	{
		path: "/",
		method: "post",
		middleware: [urlencodedParser],
		handler: downloadPage,
		help: {
			description: "build 1 page without downloading",
			method: this.method,
			parameters: [],
			example: "/",
		},
	},
	// ! Blog builder does not be able to request Blog watcher to refresh its content right now
	// {
	// 	path: "/",
	// 	method: "post",
	// 	middleware: [],
	// 	handler: downloadPages,
	// 	help: {
	// 		description: "build all the pages without downloading",
	// 		method: this.method,
	// 		parameters: [],
	// 		example: "/",
	// 	},
	// },
];

// build the router!
debug("building the download routes");
buildRouter(router, routes);

module.exports = router;
