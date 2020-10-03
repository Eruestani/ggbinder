'use strict';

const COMMANDER = require('../modules/commander.js');
const DEL = require('del');
const DELETE_EMPTY = require('delete-empty');
const FOLDERS = require('../modules/folders');
const GULP = require('gulp');
const PATH = require('path');

/*
 * Purge all build content.
 */
GULP.task('purge', function (cb) {
	const tasks = COMMANDER.getTasks().map((x) => PATH.join(FOLDERS.DIST, x.project, x.format));
	try {
		DEL.sync(tasks);
		DELETE_EMPTY.sync(PATH.resolve(FOLDERS.DIST));
		return (tasks.length > 0) ? Promise.resolve() : cb();
	} catch (error) {
		console.log(error);
		return cb();
	}
});
