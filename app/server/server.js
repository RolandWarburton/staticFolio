const path = require("path");
const fs = require("fs");
const express = require("express");
const debug = require("debug")("staticFolio:server");
const cors = require("cors");
const bodyParser = require("body-parser");
const devRebuildPage = require("../build/devFunctions/rebuildPage");
const errorHandler = require("./errorHandler");
const miscRoutes = require("./routes/miscRoutes");
require("dotenv").config();

const buildRoutes = require("./routes/buildRoutes");
const downloadRoutes = require("./routes/downloadRoutes");

debug("============================================");
debug("Blog builder is starting...");
debug(`WORKING IN:\t${process.env.ROOT}`);
debug(`RUNNING ON PORT:\t${process.env.PROTOCOL}`);
debug(`WATCHER IP:\t${process.env.WATCHER_IP}`);
debug("============================================");

if (!fs.existsSync("dist")) fs.mkdirSync("dist");

// this needs to be 50mb to stop the server from crapping itself
// with a "request entity too large" error
const urlencodedParser = bodyParser.urlencoded({
	limit: "50mb",
	extended: true,
});

// Check if we should pseudo "hot reload" some predifined pages on start
const hotReload =
	process.env.NODE_ENV == "development" && process.env.hotReload == "true";

hotReload ? debug("hot reload is on") : debug("hot reload is off");

// Create server
const app = express();

// set the view engine to ejs
app.set("view engine", "ejs");

// routes
app.use("/build", buildRoutes);
app.use("/download", downloadRoutes);
app.use("/", miscRoutes);

// Setup cors
const corsOptions = { origin: "*" };
app.use(cors(corsOptions));

// Support x-www-urlencoded on all routes
app.use(urlencodedParser);

// Start the server 🚀
app.listen(process.env.PORT, async () => {
	debug(`app listening at http://localhost:${process.env.PORT}`);

	// pseudo hot reload
	if (hotReload) devRebuildPage.execute();
});

// Error handling
app.use((err, req, res, next) => {
	errorHandler(err, req, res, next);
});
