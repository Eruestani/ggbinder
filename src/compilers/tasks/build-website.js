'use strict';

const BABELFISH = require('./../modules/babelfish.js');
const BEAUTIFY = require('gulp-beautify');
const COMMANDER = require('./../modules/commander.js');
const FOLDERS = require('../modules/folders');
const FORMAT = 'website';
const FS = require('fs');
const GULP = require('gulp');
const PATH = require('path');
const SALANDER = require('./../modules/salander.js');
const SOURCEMAPS = require('gulp-sourcemaps');
const THROUGH2 = require('through2');
const cache = require('gulp-cached');
const dom = require('gulp-dom');
const jsdom = require('jsdom');
const merge = require('merge-stream');
const sass = require('gulp-sass');
const using = require('gulp-using');

GULP.task('build-website-fonts', function (cb) {
	const tasks = COMMANDER.getTasks().filter((x) => x.format == FORMAT).map(function (task) {
		return FOLDERS.getProjectSrc(task.project, task.format, 'fonts', '*.*')
			.pipe(using())
			.pipe(GULP.dest(PATH.join(FOLDERS.DIST, task.project, task.format, 'fonts')));
	});
	return (tasks.length > 0) ? merge(tasks) : cb();
});

GULP.task('build-website-scripts', function (cb) {
	const tasks = COMMANDER.getTasks().filter((x) => x.format == FORMAT).map(function (task) {
		return FOLDERS.getProjectSrc(task.project, task.format, 'scripts', '*.js')
			.pipe(using())
			.pipe(GULP.dest(PATH.join(FOLDERS.DIST, task.project, task.format, 'scripts')));
	});
	return (tasks.length > 0) ? merge(tasks) : cb();
});

GULP.task('build-website-stylesheets', function (cb) {
	const tasks = COMMANDER.getTasks().filter((x) => x.format == FORMAT).map(function (task) {
		if (task.dev) {
			return FOLDERS.getProjectSrc(task.project, task.format, 'stylesheets', '*.scss')
				.pipe(using())
				.pipe(SOURCEMAPS.init())
				.pipe(sass())
				.pipe(SOURCEMAPS.write())
				.pipe(GULP.dest(PATH.join(FOLDERS.DIST, task.project, task.format, 'stylesheets')));
		} else {
			return FOLDERS.getProjectSrc(task.project, task.format, 'stylesheets', '*.scss')
				.pipe(using())
				.pipe(sass({ outputStyle: 'compressed' }))
				.pipe(GULP.dest(PATH.join(FOLDERS.DIST, task.project, task.format, 'stylesheets')));
		}
	});
	return (tasks.length > 0) ? merge(tasks) : cb();
});

GULP.task('build-website-images', function (cb) {
	const tasks = COMMANDER.getTasks().filter((x) => x.format == FORMAT).map(function (task) {
		return FOLDERS.getProjectSrc(task.project, task.format, 'images', '*.+(jpg|jpeg|gif|png|svg)')
			.pipe(using())
			.pipe(GULP.dest(PATH.join(FOLDERS.DIST, task.project, task.format, 'images')));
	});
	return (tasks.length > 0) ? merge(tasks) : cb();
});

GULP.task('build-website-vendors', function (cb) {
	const tasks = COMMANDER.getTasks().filter((x) => x.format == FORMAT).map(function (task) {
		return FOLDERS.getProjectSrc(task.project, task.format, 'vendors', '*.*')
			.pipe(using())
			.pipe(GULP.dest(PATH.join(FOLDERS.DIST, task.project, task.format, 'vendors')));
	});
	return (tasks.length > 0) ? merge(tasks) : cb();
});

GULP.task('build-website-html', function (cb) {
	const tasks = COMMANDER.getTasks().filter((x) => x.format == FORMAT).map(function (task) {
		if (task.dev) {
			return task.languages.flatMap((x) => buildFragments(task.project, x));
		} else {
			return task.languages.flatMap((x) => buildCollections(task.project, x));
		}
	});
	return (tasks.length > 0) ? merge(tasks) : cb();
});

/**
 * Build a website fragment (individual chapter).
 * @param {string} project
 * @param {string} language
 * @return {object} gulp stream
 */
function buildFragments (project, language) {
	return FOLDERS.getProjectSrc(project, FORMAT, 'fragments', '*.html')
		.pipe(using())
		.pipe(cache(`${project}_${FORMAT}_${language ? language : 'en'}_fragments`))
		.pipe(dom(function (dom) {
			formatPage(dom, project, language);
			SALANDER.setWebsiteWrapper(project, FORMAT, 'website', dom);
			SALANDER.formatPages(dom);
			return dom;
		}))
		.pipe(BEAUTIFY.html({ indent_with_tabs: true }))
		.pipe(GULP.dest(PATH.join(FOLDERS.DIST, project, FORMAT, language)));
}

/**
 * Build a website collection (full site).
 * @param {string} project
 * @param {string} language
 * @return {object} gulp stream
 */
function buildCollections (project, language) {
	return FOLDERS.getProjectSrc(project, FORMAT, 'collections', '*.json')
		.pipe(using())
		.pipe(THROUGH2.obj(function (chunk, enc, callback) {
			const files = [];
			const json = JSON.parse(chunk.contents.toString());
			let indexChapter = 0;
			let indexAppendix = 0;

			json.contents.forEach(function (content) {
				if (!content.formats || content.formats && content.formats.includes(FORMAT)) {
					switch (content.type) {
					case 'SECTION':
						content.chapters.forEach(function (chapter) {
							if (!chapter.formats || chapter.formats && chapter.formats.includes(FORMAT)) {
								try {
									let html = FOLDERS.getFile(project, FORMAT, 'fragments', `${chapter.filename}.html`);
									if (content.isAppendix) {
										indexAppendix++;
									} else {
										indexChapter++;
									}
									if (chapter.fragments) {
										let pages = '';
										chapter.fragments.forEach(function (fragment) {
											const fragmentPages = FOLDERS.getFile(project, FORMAT, 'fragments', `${fragment}.html`);
											pages += fragmentPages.match(/(<book.*?>)(.*)(<\/book>)/s)[2];
										});
										html = html.replace(/(<book.*?>)(.*)(<\/book>)/s, `$1$2${pages}$3`);
									}
									files.push({
										html: (new jsdom.JSDOM(html.match(/(<book.*?>)(.*)(<\/book>)/s)[2])).window.document,
										filename: chapter.filename,
										isAppendix: content.isAppendix,
										chapter: (content.isAppendix ? String.fromCharCode(64 + indexAppendix) : indexChapter)
									});
								} catch (err) {
									console.error(`Couldn't load file: [${chapter.filename}]: ${err}`);
									return '';
								}
							}
						});
						break;
					}
				}
			});
			files.forEach(function (file, index) {
				formatPage(file.html, project, language);
				SALANDER.setWebsiteWrapper(project, FORMAT, (json.wrapper && json.wrapper.filename ? json.wrapper.filename : 'website'), file.html);
				SALANDER.formatPages(file.html, file.chapter);
				SALANDER.setPageClass(file.html, `page--${file.filename.replace(/_/g, '-')}`);
				FOLDERS.createPath([ FOLDERS.DIST, project, FORMAT, language ? language : 'en' ]);
				FS.writeFileSync(PATH.join(FOLDERS.DIST, project, FORMAT, language ? language : 'en', `${file.filename}.html`), file.html.documentElement.innerHTML);
			});
			callback(null, chunk);
		}));
}

/**
 * Format pages.
 * @param {object} dom
 * @param {string} project
 * @param {string} language
 * @return {object} dom
 */
function formatPage (dom, project, language) {
	// Apply project-specific modules (if any).
	const projectModule = PATH.join(process.cwd(), FOLDERS.PROJECTS, project, 'modules', `${project}.js`);
	if (FOLDERS.fileExists(projectModule)) {
		const PROJECT_MODULE = require(projectModule);
		PROJECT_MODULE.apply(dom, FORMAT, language);
	}

	// Apply language translations
	BABELFISH.insertMessages(dom, project, FORMAT, language);
	return dom;
}

GULP.task('build-website', GULP.parallel(
	'build-website-fonts',
	'build-website-scripts',
	'build-website-stylesheets',
	'build-website-images',
	'build-website-vendors',
	'build-website-html'
));
