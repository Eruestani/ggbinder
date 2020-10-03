'use strict';

const FOLDERS = require('../modules/folders.js');
const MINIMIST = require('minimist')(process.argv);

module.exports = {
	getCommands: getCommands,
	getTasks: getTasks
};

/**
 * Get current commands from command-line interface.
 * @return {object} list of valid commands
 */
function getCommands () {
	const project = MINIMIST.project ? MINIMIST.project : null;
	const format = MINIMIST.format ? MINIMIST.format : null;
	const language = MINIMIST.language ? MINIMIST.language : null;
	const file = MINIMIST.file ? MINIMIST.file : null;
	const dev = MINIMIST.dev ? true : false;
	return {
		project,
		format,
		language,
		file,
		dev
	};
}

/**
 * Get current tasks derived from command-line interface.
 * @return {object[]} list of actionable tasks
 */
function getTasks () {
	const commands = getCommands();
	const tasks = [];
	const projects = commands.project ? FOLDERS.getProjects().filter((x) => x == commands.project) : FOLDERS.getProjects();

	projects.forEach(function (project) {
		const info = FOLDERS.getProjectInfo(project);
		const formats = commands.format ? info.formats.filter((x) => x.type == commands.format) : info.formats;
		formats.forEach(function (format) {
			const languages = commands.language ? format.languages.filter((x) => x == commands.language) : format.languages;
			tasks.push({
				project: project,
				format: format.type,
				languages: languages,
				file: commands.file,
				dev: commands.dev
			});
		});
	});

	return tasks;
}
