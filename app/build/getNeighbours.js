const getParent = require("./getParent");
const debug = require("debug")("staticFolio:neighbours");
const path = require("path");
/**
 *
 * @param {Array} siblings - Array of siblings
 * @param {JSON} page - database page
 * @example getNeighbours(['page1', 'page2'], {websitePath: '/path/pages'})
 */
const getNeighbours = (siblings, page) => {
	const result = { prev: {}, next: {} };

	// use find() to get the first page that matches the arguments websitePath by checking every sibling
	siblings.find((potentialPage, i) => {
		if (page.websitePath == potentialPage.websitePath) {
			result.next = siblings[i + 1];
			result.prev = siblings[i - 1];
		}
	});

	return result;
};

module.exports = getNeighbours;
