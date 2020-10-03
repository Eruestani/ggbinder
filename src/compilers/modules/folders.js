'use strict';

const DIST = 'dist';
const FORMATS = 'src/formats';
const FS = require('fs');
const GLOB = require('glob');
const GULP = require('gulp');
const PATH = require('path');
const PROJECTS = 'src/projects';
const merge = require('merge-stream');

module.exports = {
	DIST: DIST,
	PROJECTS: PROJECTS,
	FORMATS: FORMATS,
	getProjects: getProjects,
	getProjectSrc: getProjectSrc,
	getFiles: getFiles,
	getFile: getFile,
	createPath: createPath,
	getProjectInfo: getProjectInfo,
	fileExists: fileExists
};

/**
 * List all valid projects in the project folder. Project must have a .project file.
 * @return {string[]} list of project folder names
 */
function getProjects () {
	return FS.readdirSync(PROJECTS).filter(function (file) {
		return FS.statSync(PATH.join(PROJECTS, file)).isDirectory() && FS.existsSync(PATH.join(PROJECTS, file, '.project'));
	});
}

/**
 * Get the project file for a specific project.
 * @param {string} project folder name
 * @return {object} contents of project info file
 */
function getProjectInfo (project) {
	const file = PATH.join(PROJECTS, project, '.project');
	return JSON.parse(FS.readFileSync(file, 'utf8'));
}

/**
 * Get a stream of files for a specific project/format/folder combination. Gathers files from three locations:
 * 1. Root format folder.
 * 2. Root project folder.
 * 3. Project format folder.
 * @param {string} project project name
 * @param {string} format format name
 * @param {string} folder folder name
 * @param {string} files specific filename (optional)
 * @param {string} filter file filter (optional)
 * @return {object} gulp src stream
 */
function getProjectSrc (project, format, folder, files, filter) {
	return merge(
		GULP.src(
			PATH.join(FORMATS, `${format}/${folder}/**/${filter ? filter : ''}${files}`),
			{ base: PATH.join(FORMATS, `${format}/${folder}`) }
		),
		GULP.src(
			[
				PATH.join(PROJECTS, project, `${folder}/**/${filter ? filter : ''}${files}`),
				`!${PATH.join(PROJECTS, project, `${folder}/_*/**/${filter ? filter : ''}${files}`)}`
			],
			{ base: PATH.join(PROJECTS, project, `${folder}`) }
		),
		GULP.src(
			PATH.join(PROJECTS, project, `${folder}/_${format}/**/${filter ? filter : ''}${files}`),
			{ base: PATH.join(PROJECTS, project, `${folder}/_${format}`) }
		)
	);
}

/**
 * List all files for a specific project/format/folder combination. Searches in three locations:
 * 1. Root format folder.
 * 2. Root project folder.
 * 3. Project format folder.
 * @param {string} project project name
 * @param {string} format format name
 * @param {string} folder folder name
 * @param {string} filename specific filename (optional)
 * @return {string[]} list of file paths
 */
function getFiles (project, format, folder, filename) {
	const paths = [
		PATH.join(PROJECTS, project, folder, `_${format}`, filename),
		PATH.join(PROJECTS, project, folder, filename),
		PATH.join(FORMATS, format, folder, filename)
	];
	return paths.flatMap((x) => GLOB.sync(x));
}

/**
 * Check if a file exists at a given filepath.
 * @param {string} filepath search location
 * @return {boolean} true if file exists, false otherwise.
 */
function fileExists (filepath) {
	return FS.existsSync(filepath);
}

/**
 * Get a project file for a specific project/format/folder combination. Searches in three locations but only returns the first file found:
 * 1. Project format folder.
 * 2. Root project folder.
 * 3. Root format folder.
 * @param {string} project
 * @param {string} format
 * @param {string} folder
 * @param {string} filename
 * @return {object}
 */
function getFile (project, format, folder, filename) {
	const paths = [
		PATH.join(PROJECTS, project, folder, `_${format}`, filename),
		PATH.join(PROJECTS, project, folder, filename),
		PATH.join(FORMATS, format, folder, filename)
	];
	let file = null;
	paths.some(function (path) {
		if (FS.existsSync(path)) {
			file = FS.readFileSync(path, 'utf8');
			return true;
		} else {
			return false;
		}
	});
	return file;
}

/**
 * Create a folder path.
 * @param {string[]} folders list of folders
 */
function createPath (folders) {
	let target = '';
	folders.forEach(function (folder) {
		target = PATH.join(target, folder);
		if (!FS.existsSync(target)) {
			FS.mkdirSync(target);
		}
	});
}
