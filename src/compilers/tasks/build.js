'use strict';

const GULP = require('gulp');

require('./purge');
require('./watch');

/*
 * Master build tasks
 */
GULP.task('build', GULP.series('purge', GULP.parallel('build-book', 'build-website')));
GULP.task('build-and-watch', GULP.series('purge', GULP.parallel('build-book', 'build-website'), 'watch'));
