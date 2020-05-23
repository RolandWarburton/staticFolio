const path = require('path')
const fs = require('fs');
const util = require('util')
const readdirp = require('readdirp');
const emoji = require('node-emoji');
const minify = require('html-minifier').minify;
const colors = require('colors');
const mkdirp = require('mkdirp')
const ProgressBar = require('progress');
const fetch = require('node-fetch')
const argv = require('yargs').argv
require('dotenv').config()
const generateHtmlPage = require('./generateHtmlPage')
const tickProgressBar = require('./tickProgressBar')

const write = util.promisify(fs.writeFile)

const minifyOptions = {
	removeAttributeQuotes: true,
	collapseWhitespace: true,
	html5: true,
	minifyCSS: true,
	removeEmptyElements: true,
	removeComments: true,
	useShortDoctype: true
}

const fetchGitData = async function (url) {
	const data = fetch(url, { headers: { 'Content-Type': 'application/json' } })
		.then((res) => {
			return res.json();
		})
		.then((json) => {
			// if (json.length == 0) throw Error("json length fetched was 0");
			return json;
		})
		.catch((err) => {
			console.log(err)
		})

	return data;
}

/**
* @param {URL} url - the url
*/
const constructGithubApiCommitRequest = function (url) {
	const repoParts = url.pathname.split("/")
	const author = repoParts[1];
	const repoName = repoParts[2];
	repoParts.splice(0, 4);
	const repoPath = repoParts.join("/");

	// for some reason encoreURIComponent breaks the whole url so i need to encode &'s as a special case at the cost of optimization :(
	const apiUrl = `https://${process.env.GITHUB_TOKEN}@api.github.com/repos/${author}/${repoName}/commits?path=${repoPath.replace("&", "%26")}`
	return apiUrl;
}


// takes array and drills out 'hash.sha' data
const extractHashes = function (commitData) {
	const hashes = [];
	for (hash of commitData) {
		hashes.push(hash.sha);
	}
	return hashes;
}



const generateAndWriteHTML = async function (templateData, filepath) {
	await generateHtmlPage(templateData, filepath)
		.then(({ html, templateData }) => {
			// Emojify it 💯
			return emoji.emojify(html)
		})
		.then((html) => {
			// Minify it 🗜
			return minify(html, minifyOptions)
		})
		.then((html) => {
			// Write it to dist 📤

			// Get some directories to create a write path

			// The base output directory
			const dist = path.resolve(process.env.ROOT, "dist")
			// The directory to place the writeDirectory
			const writeBaseDirectory = path.parse(filepath.path).dir
			// The name of the directory to place the index.html in
			const writeDirectory = path.parse(filepath.path).name.replace(/\s/g, '')

			// Builds the path for the index.html
			// For example if the output file in views/... was "Notes/topic.js"
			// ...then the fullWritePath will be ../Notes/topic/index.html
			// const fullWritePathToDirectory = 
			const fullWritePathToDirectory = (filepath.path != "index.js") ?
				path.resolve(dist, writeBaseDirectory, writeDirectory, "index")
				: path.resolve(dist);

			// write it to the dist folder
			mkdirp(fullWritePathToDirectory)
				.then(() => { write(path.resolve(fullWritePathToDirectory, "index.html"), html) }).catch(err => console.log(err))

			console.log(`wrote ${filepath.path}`.red)
			return filepath
		})
		.catch(err => console.log(err))
}

// return an array of promises
const getCommitData = function (urls) {
	// create an array to store promises that will later be fufilled to become commit data (from the api)
	const gitData = [];

	// put all the git data promises into gitData to resolve later
	if (urls) {
		for (url of urls) {

			// a url might look like: https://api.github.com/repos/RolandWarburton/knowledge/commits?path=Linux/Terminals.md
			const targetRequestURL = constructGithubApiCommitRequest(new URL(url))
			const data = fetchGitData(targetRequestURL)
			gitData.push(data)
		}
	} else {
		// return [new Promise((res, rej) => {return []})];
		return []
	}
	return gitData;
}

// return the commit by its hash
/**
 * 
 * @param {Array} commits 
 */
const getcommitByHash = function (commits, hash) {
	return commits.filter(
		function (commit) { return commit.sha == hash }
	);
}

// return the commit by its filepath
/**
 * 
 * @param {Array} commits 
 */
const getcommitByfilepath = function (commits, filepath) {
	return commits.filter(
		function (commit) { return commit.filepath == filepath }
	);
}

module.exports = async () => {
	let pageTotal = 0
	let pageCurrent = 0

	const bar = new ProgressBar(':bar :current :currentFile', { total: 1000, width: 30 });

	const pageFilepaths = [];

	const buildData = await fetchGitData(`https://${process.env.GITHUB_TOKEN}@api.github.com/repos/RolandWarburton/staticFolio/commits/refs/heads/master`);
	console.log(`Commit ID ${buildData.sha.substring(0, 4)}`)
	fs.appendFileSync("log.txt", `\n${new Date().toISOString()} started build on ${buildData.sha.substring(0, 4)}`);

	// you could put some static information here
	templateData = {
		build: {
			sha: (buildData.sha).substring(0, 4),
			date: buildData.commit.author.date,
			author: buildData.commit.author
		}
	}

	// Get every page in the src/views and concurrently generate and write html to dist
	readdirp("./src/views", { fileFilter: '*.js', alwaysStat: false })
		.on('data', (filepath) => {
			// increment the total number of pages found
			pageTotal++;
			pageFilepaths.push(filepath);
		})
		.on('end', () => {
			// now that we have the number of files
			// update the total number of ticks required to fill the progress bar
			bar.total = pageTotal;
			console.log(`finished reading local files (${pageTotal})`);

			const read = util.promisify(fs.readFile)
			fs.readFile(path.resolve("fileHashes", "hashes.json"), (err, data) => {
				if (err) throw err;
				const oldGitData = JSON.parse(data);

				pageFilepaths.map((filepath) => {
					// get the targets as an array
					const targets = require(filepath.fullPath).target;

					// get the output filepath to write the hash information to 
					// const hashFilepath = path.resolve("fileHashes", path.parse(filepath.path).name + ".json");

					const allGitData = getCommitData(targets)

					if (targets) {
						// console.log(targets)
						// resolve all of gitData into github commit json from the api
						Promise.all(allGitData)
							.then((allCommitData) => {
								const reconstructedCommits = []
								allCommitData.forEach((commits, i) => {
									console.log(`COMMIT ${i} - ${filepath.path}`.blue.bold)

									// get all the old commits
									const oldCommits = []
									for (commit of oldGitData) {
										oldCommits.push(getcommitByfilepath(oldGitData, filepath));
									}
									console.log(`read ${oldCommits.length} oldcommits`)
									// reconstructedCommits.push(oldCommits)
									console.log(oldCommits)

									// get all the new commits
									const newCommits = []
									for (commit of commits) {
										newCommits.push(commit);
									}
									console.log(`read ${newCommits.length} newcommits`)

									const length = (newCommits.length >= oldCommits.length) ? oldCommits.length : newCommits.length;
									// compare them
									for (let i = 0; i < length; i++) {
										if (oldCommits[i] && newCommits[i]) {
											if (oldCommits[i].sha == newCommits[i].sha) {
												console.log("MATCH BOI")
											}
										} else {
											console.log(`oh no ${i} - ${length}- ${newCommits.length} & ${oldCommits.length}`.red)
											
											// console.log(newCommits[i])
											// oldCommits.push({sha: newCommits[i].sha, filepath: newCommits[i].filepath})
										}
									}

									// for (commit of oldCommits) {
									// 	console.log(commit.sha)
									// }
									// console.log(reconstructedCommits)

									// fs.writeFileSync("fileHashes/hashes.json", JSON.stringify(oldCommits))
									
								})
							})
					}
				})
			})
		})
}


		// .then((oldCommits) => {
									// 	return JSON.parse(oldCommits)
									// })
									// .then((oldCommits) => {
									// 	console.log("got here")
									// 	// for a pages commit data: [gist.com/a, gist.com/b...]
									// 	// for (commits of allCommitData) {
									// 	// 	// for each commit in this targets commit history: gist.com/a
									// 	// 	commits.forEach((commit, i) => {
									// 	// 		console.log(getcommitByHash(commits, commit))
									// 	// 		// if (commit == oldCommits[i]) {
									// 	// 		// 	console.log("all good chief")
									// 	// 		// }
									// 	// 	})
									// 	// }
									// })


			// // for a pages commit data: [gist.com/a, gist.com/b...]
			// for (commits of allCommitData) {
			// 	// for each commit in this targets commit history: gist.com/a
			// 	for (commit of commits) {
			// 		console.log(c.sha);
			// 	}
			// }

						// 	if (allCommitData) {
						// 		// update the progress bar
						// 		tickProgressBar(bar, filepath);

						// 		// create a json structure to store the hash in
						// 		// ! could be bit buggy because it needs to handle any amount of targets and the fetching system will only
						// 		// ! randomly store the most recent hash only that happened to return last
						// 		const newFileHash = []

						// 		// for each commitData for this page (0 to many)
						// 		for (commit of allCommitData) {
						// 			// put it in the newFileHash list
						// 			newFileHash.push({ filepath: filepath, sha: commit[0].sha });
						// 		}

						// 		// read the old hash for this page
						// 		fs.readFile(hashFilepath, (err, data) => {
						// 			// if the file was found
						// 			if (!err) {
						// 				// else the hash file was found... parse it
						// 				const oldFileHash = JSON.parse(data);

						// 				const oldFileHashLength = oldFileHash.length;
						// 				const newFileHashLength = newFileHash.length;

						// 				if (oldFileHashLength == newFileHashLength) {
						// 					let mismatch = false;
						// 					oldFileHash.forEach((hash, i) => {
						// 						if (hash.sha != newFileHash[i].sha && !mismatch) {
						// 							mismatch = true;
						// 						}
						// 						return mismatch;
						// 					});
						// 					// if everything matches then the hashmatch is true
						// 					if (!mismatch) hashMatch = true;
						// 					console.log("everything checks out")
						// 				}


						// 				// // if the hash we have doesnt match the new one
						// 				// if (newFileHash == oldFileHash) {
						// 				// 	// page is up to date ❤
						// 				// 	// console.log("page is up to date. skipping")
						// 				// 	hashMatch = true;
						// 				// }
						// 			}

						// 			// hash file either doesnt exist or does not match the new hash
						// 			if (!hashMatch) {
						// 				// write the hash to fileHashes/*
						// 				fs.writeFile(hashFilepath, JSON.stringify(newFileHash), () => { })
						// 			}
						// 		})
						// 	}
						// });
				// } else {
				// 	// no targets for this file
				// 	if (!argv.q) {
				// 		bar.tick({
				// 			'currentFile': path.parse(filepath.path).name
				// 		})
				// 	}
				// }
				// if theres no match then write it!
				// if (!hashMatch) {
				// 	// generateAndWriteHTML(templateData, filepath);
				// }



				// if (err.code == "ENOENT") {
				// 	console.log(`couldnt find version control file 🤕`.red)
				// 	const hashes = []
				// 	for (commits of allCommitData) {
				// 		hashes.push({ sha: extractHashes(commits), filepath: filepath.path })
				// 	}
				// 	// fs.writeFile(path.resolve("fileHashes/hashes.json"), JSON.stringify(hashes), () => { })
				// }