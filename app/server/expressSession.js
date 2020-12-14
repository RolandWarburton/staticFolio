const expressSession = require("express-session");

// express session configuration
// Used as part of the SSO system
const session = expressSession({
	secret: "keyboard cat",
	resave: false,
	saveUninitialized: true,
	cookie: {
		maxAge: 3600000,
	},
});

module.exports = session;
