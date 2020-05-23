
const argv = require('yargs').argv

// take a progressbar and the current file and tick it
module.exports = function (bar, filepath) {
	if (!argv.q) {
		bar.tick({
			'currentFile': path.parse(filepath.path).name
		})
	}
}