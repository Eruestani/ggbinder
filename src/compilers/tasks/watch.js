'use strict';

const COMMANDER = require('../modules/commander.js');
const FOLDERS = require('../modules/folders');
const GULP = require('gulp');

GULP.task('watch', function (cb) {
	COMMANDER.getTasks().forEach(function (task) {
		GULP.watch(getFolders(task.project, task.format, 'fonts/**/*.*'), GULP.series([ `build-${task.format}-fonts` ]));
		GULP.watch(getFolders(task.project, task.format, 'scripts/**/*.js'), GULP.series([ `build-${task.format}-scripts` ]));
		GULP.watch(getFolders(task.project, task.format, 'stylesheets/**/*.scss'), GULP.series([ `build-${task.format}-stylesheets` ]));
		GULP.watch(getFolders(task.project, task.format, 'images/**/*.+(jpg|jpeg|gif|png|svg)'), GULP.series([ `build-${task.format}-images` ]));
		GULP.watch(getFolders(task.project, task.format, 'vendors/**/*.*'), GULP.series([ `build-${task.format}-vendors` ]));
		GULP.watch(getFolders(task.project, task.format, 'fragments/**/*.*'), GULP.series([ `build-${task.format}-html` ]));
		GULP.watch(getFolders(task.project, task.format, 'translations/**/*.txt'), GULP.series([ `build-${task.format}-html` ]));
		GULP.watch(getFolders(task.project, task.format, 'wrappers/**/*.*'), GULP.series([ `build-${task.format}-html` ]));
	});

	return cb();
});

/**
 * Get a list of src folder paths for a project/format.
 * @param {string} project
 * @param {string} format
 * @param {string} path
 * @return {string[]} filepaths
 */
function getFolders (project, format, path) {
	return [
		`${FOLDERS.FORMATS}/${format}/${path}`,
		`${FOLDERS.PROJECTS}/${project}/${path}`
	];
}
