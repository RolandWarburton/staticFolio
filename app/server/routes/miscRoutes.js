const express = require("express");
const bodyParser = require("body-parser");
const buildRouter = require("./buildRouter");
const debug = require("debug")("staticFolio:routers");
const router = express.Router();

// controllers
const buildPage = require("../controllers/buildPage");
const buildPages = require("../controllers/buildPages");

// create application/x-www-form-urlencoded parser
const urlencodedParser = bodyParser.urlencoded({
	limit: "50mb",
	extended: true,
});

const routes = [
	{
		path: "/build_ui",
		method: "get",
		middleware: [],
		handler: (req, res) => {
			res.render("index.ejs");
		},
		help: {
			description: "Get the build UI",
			method: this.method,
			parameters: [],
			example: "/build_ui",
		},
	},
	{
		path: "/",
		method: "get",
		middleware: [],
		handler: (req, res) => {
			debug(`This session is: ${req.session.id}`);
			res.status(200).json({
				what: `SSO-Consumer One`,
				title: "Blog Builder | Home",
				role: req.session.user.role,
				email: req.session.user.email,
				uid: req.session.user.uid,
				globalSessionID: req.session.user.globalSessionID,
				iat: req.session.user.iat,
				exp: req.session.user.exp,
				iss: req.session.user.iss,
				cookie: req.session.cookie || "not sure",
				expires: req.session.cookie.maxAge / 1000 + "'s",
			});
		},
		help: {
			description: "Show some info about the current session",
			method: this.method,
			parameters: [],
			example: "/",
		},
	},
];

// build the router!
debug("building the build routes");
buildRouter(router, routes);

module.exports = router;
