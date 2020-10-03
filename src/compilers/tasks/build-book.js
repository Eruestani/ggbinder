/* eslint no-invalid-this: "off" */

'use strict';

const BABELFISH = require('./../modules/babelfish.js');
const BEAUTIFY = require('gulp-beautify');
const COMMANDER = require('./../modules/commander.js');
const FOLDERS = require('../modules/folders');
const FORMAT = 'book';
const GLOB = require('glob');
const GULP = require('gulp');
const PATH = require('path');
const PUPPETEER = require('puppeteer');
const PUPPETEER_BROWSER = {
	headless: true,
	args: [ '--font-render-hinting=none' ]
};
const QUILL = require('./../modules/quill.js');
const SOURCEMAPS = require('gulp-sourcemaps');
const THROUGH2 = require('through2');
const cache = require('gulp-cached');
const dom = require('gulp-dom');
const merge = require('merge-stream');
const rename = require('gulp-rename');
const sass = require('gulp-sass');
const using = require('gulp-using');

GULP.task('build-book-fonts', function (cb) {
	const tasks = COMMANDER.getTasks().filter((x) => x.format == FORMAT).map(function (task) {
		return FOLDERS.getProjectSrc(task.project, task.format, 'fonts', '*.*')
			.pipe(using())
			.pipe(GULP.dest(PATH.join(FOLDERS.DIST, task.project, task.format, 'fonts')));
	});
	return (tasks.length > 0) ? merge(tasks) : cb();
});

GULP.task('build-book-scripts', function (cb) {
	const tasks = COMMANDER.getTasks().filter((x) => x.format == FORMAT).map(function (task) {
		return FOLDERS.getProjectSrc(task.project, task.format, 'scripts', '*.js')
			.pipe(using())
			.pipe(GULP.dest(PATH.join(FOLDERS.DIST, task.project, task.format, 'scripts')));
	});
	return (tasks.length > 0) ? merge(tasks) : cb();
});

GULP.task('build-book-stylesheets', function (cb) {
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

GULP.task('build-book-images', function (cb) {
	const tasks = COMMANDER.getTasks().filter((x) => x.format == FORMAT).map(function (task) {
		return FOLDERS.getProjectSrc(task.project, task.format, 'images', '*.+(jpg|jpeg|gif|png|svg)')
			.pipe(using())
			.pipe(GULP.dest(PATH.join(FOLDERS.DIST, task.project, task.format, 'images')));
	});
	return (tasks.length > 0) ? merge(tasks) : cb();
});

GULP.task('build-book-vendors', function (cb) {
	const tasks = COMMANDER.getTasks().filter((x) => x.format == FORMAT).map(function (task) {
		return FOLDERS.getProjectSrc(task.project, task.format, 'vendors', '*.*')
			.pipe(using())
			.pipe(GULP.dest(PATH.join(FOLDERS.DIST, task.project, task.format, 'vendors')));
	});
	return (tasks.length > 0) ? merge(tasks) : cb();
});

GULP.task('build-book-html', function (cb) {
	const tasks = COMMANDER.getTasks().filter((x) => x.format == FORMAT).map(function (task) {
		if (task.dev) {
			return task.languages.flatMap((x) => buildFragments(task.project, x));
		} else {
			return task.languages.flatMap((x) => buildCollections(task.project, x));
		}
	});
	return (tasks.length > 0) ? merge(tasks) : cb();
});

GULP.task('build-book-pdfs', function (cb) {
	const tasklist = COMMANDER.getTasks().filter((x) => x.format == FORMAT);
	return (tasklist.length > 0) ? renderPdfs(tasklist) : cb();
});

GULP.task('build-book-jpgs', function (cb) {
	const tasklist = COMMANDER.getTasks().filter((x) => x.format == FORMAT);
	return (tasklist.length > 0) ? renderJpgs(tasklist) : cb();
});

GULP.task('build-book-pngs', function (cb) {
	const tasklist = COMMANDER.getTasks().filter((x) => x.format == FORMAT);
	return (tasklist.length > 0) ? renderPngs(tasklist) : cb();
});

/**
 * Build html fragments.
 * @param {string} project
 * @param {string} language
 * @return {object} gulp stream
 */
function buildFragments (project, language) {
	return FOLDERS.getProjectSrc(project, FORMAT, 'fragments', '*.html')
		.pipe(using())
		.pipe(cache(`${project}_${FORMAT}_${language ? language : 'en'}_fragments`))
		.pipe(dom(function () {
			formatPage(this, project, language);
			QUILL.setBookWrapper(project, FORMAT, 'book', this);
			QUILL.formatPages(this);
			return this;
		}))
		.pipe(BEAUTIFY.html({ indent_with_tabs: true }))
		.pipe(rename(function (path) {
			path.basename += (language ? `_${language}` : ``);
		}))
		.pipe(GULP.dest(PATH.join(FOLDERS.DIST, project, FORMAT, 'html')));
}

/**
 * Build html collections.
 * @param {string} project
 * @param {string} language
 * @return {object} gulp stream
 */
function buildCollections (project, language) {
	let filename = '';
	let version = '';
	return FOLDERS.getProjectSrc(project, FORMAT, 'collections', '*.json')
		.pipe(using())
		.pipe(THROUGH2.obj(function (chunk, enc, callback) {
			const json = JSON.parse(chunk.contents.toString());

			// Get collection details
			filename = (json.output && json.output.filename) ? json.output.filename : project;
			version = (json.meta && json.meta.version) ? `_v${json.meta.version.replace(/\./g, '_')}` : '';

			// Get inital html from initial wrapper
			let html = FOLDERS.getFile(
				project,
				FORMAT,
				'wrappers',
				`${(json.wrapper && json.wrapper.filename) ? json.wrapper.filename : 'book'}.html`
			);

			let innerHtml = ``;
			json.contents.forEach(function (content) {
				switch (content.type) {
				case 'SECTION':
					if (content.title) {
						innerHtml += QUILL.createPageSection(content);
					}
					innerHtml += content.chapters.map(function (chapter) {
						try {
							let file = FOLDERS.getFile(project, FORMAT, 'fragments', `${chapter.filename}.html`);
							if (content.isAppendix) {
								file = file.replace(/(<page.*?)(>)/gs, '$1 data-is-appendix=\'true\' $2');
							}
							if (chapter.fragments) {
								let pages = '';
								chapter.fragments.forEach(function (fragment) {
									let fragmentPages = FOLDERS.getFile(project, FORMAT, 'fragments', `${fragment}.html`);
									if (content.isAppendix) {
										fragmentPages = fragmentPages.replace(/(<page.*?)(>)/gs, '$1 data-is-appendix=\'true\' $2');
									}
									pages += fragmentPages.match(/(<book.*?>)(.*)(<\/book>)/s)[2];
								});
								file = file.replace(/(<book.*?>)(.*)(<\/book>)/s, `$1$2${pages}$3`);
							}
							return file.match(/(<book.*?>)(.*)(<\/book>)/s)[2];
						} catch (err) {
							console.error(`Couldn't load file: [${chapter.filename}]: ${err}`);
							return '';
						}
					}).join('\n');
					break;
				default:
					console.error(`Unsupported content type: ${content.type}`);
					break;
				}
			});
			html = html.replace(/(<book.*?>)(.*)(<\/book>)/s, `$1${innerHtml}$3`);

			// Pass html through to next pipe
			chunk.contents = Buffer.from(html);
			callback(null, chunk);
		}))
		.pipe(dom(function () {
			formatPage(this, project, language);
			QUILL.formatPages(this);
			return this;
		}))
		.pipe(BEAUTIFY.html({ indent_with_tabs: true }))
		.pipe(rename(function (path) {
			path.basename = filename + version + (language ? `_${language}` : '');
			path.extname = '.html';
		}))
		.pipe(GULP.dest(PATH.join(FOLDERS.DIST, project, FORMAT, 'html')));
}

/**
 * Build pdfs.
 * @param {object[]} tasks
 */
async function renderPdfs (tasks) {
	let browser = null;
	try {
		browser = await PUPPETEER.launch(PUPPETEER_BROWSER);
		tasks = processTasks(tasks);
		const processes = tasks.map(async function (task) {
			try {
				console.debug(`Opening ${task.file}...`);
				const page = await browser.newPage();
				await page.goto(`file://${PATH.join(process.cwd(), task.file)}`, { timeout: 3000000 });
				await page.waitForSelector('.document-loaded');

				FOLDERS.createPath([ FOLDERS.DIST, task.project, task.format, 'renders', 'pdfs' ]);
				const outputPath = PATH.join(process.cwd(), FOLDERS.DIST, task.project, task.format, 'renders', 'pdfs', `${PATH.parse(PATH.basename(task.file)).name}.pdf`);
				await page.pdf({
					path: outputPath,
					format: 'letter',
					printBackground: true
				});

				console.debug(`Saved ${outputPath}...`);
				await page.close();
			} catch (error) {
				console.log(error);
			}
		});
		return Promise.all(processes).catch((error) => {
			console.error(error);
		}).then(() => {
			browser.close();
		});
	} catch (error) {
		throw new Error(error);
	}
}

/**
 * Build jpgs.
 * @param {object[]} tasks
 */
async function renderJpgs (tasks) {
	let browser = null;
	try {
		browser = await PUPPETEER.launch(PUPPETEER_BROWSER);
		tasks = processTasks(tasks);
		const processes = tasks.map(async function (task) {
			try {
				console.debug(`Opening ${task.file}...`);
				const page = await browser.newPage();
				await page.goto(`file://${PATH.join(process.cwd(), task.file)}`, { timeout: 3000000 });
				await page.waitForSelector('.document-loaded');

				// Get list of page elements and coords to render
				const elements = await page.$$eval('book > *', (elements) => elements.map(function (element) {
					return {
						height: element.offsetHeight,
						width: element.offsetWidth,
						x: element.offsetLeft,
						y: element.offsetTop
					};
				}));

				FOLDERS.createPath([ FOLDERS.DIST, task.project, task.format, 'renders', 'jpgs' ]);
				await elements.reduce(async (value, element, index) => {
					const outputPath = PATH.join(process.cwd(), FOLDERS.DIST, task.project, task.format, 'renders', 'jpgs', `${PATH.parse(PATH.basename(task.file)).name}_p${index}.jpg`);
					await value;
					try {
						await page.setViewport({
							width: element.width,
							height: element.height,
							deviceScaleFactor: 1
						});
						await page.evaluate((element) => {
							window.scrollTo(element.x, element.y);
						}, element);
						await page.screenshot({
							path: outputPath,
							type: 'jpeg',
							quality: 90
						});
						console.debug(`Saved ${outputPath}`);
					} catch (error) {
						console.error(error);
					}
					return Promise.resolve();
				}, Promise.resolve());
				await page.close();
			} catch (error) {
				console.error(error);
			}
		});
		return Promise.all(processes).catch((error) => {
			console.error(error);
		}).then(() => {
			browser.close();
		});
	} catch (error) {
		throw new Error(error);
	}
}

/**
 * Build pngs.
 * @param {object[]} tasks
 */
async function renderPngs (tasks) {
	let browser = null;
	try {
		browser = await PUPPETEER.launch(PUPPETEER_BROWSER);
		tasks = processTasks(tasks);
		const processes = tasks.map(async function (task) {
			try {
				console.debug(`Opening ${task.file}...`);
				const page = await browser.newPage();
				await page.goto(`file://${PATH.join(process.cwd(), task.file)}`, { timeout: 3000000 });
				await page.waitForSelector('.document-loaded');

				// Get list of page elements and coords to render
				const elements = await page.$$eval('book > *', (elements) => elements.map(function (element) {
					return {
						height: element.offsetHeight,
						width: element.offsetWidth,
						x: element.offsetLeft,
						y: element.offsetTop
					};
				}));

				FOLDERS.createPath([ FOLDERS.DIST, task.project, task.format, 'renders', 'pngs' ]);
				await elements.reduce(async (value, element, index) => {
					const outputPath = PATH.join(process.cwd(), FOLDERS.DIST, task.project, task.format, 'renders', 'pngs', `${PATH.parse(PATH.basename(task.file)).name}_p${index}.png`);
					await value;
					try {
						await page.setViewport({
							width: element.width,
							height: element.height,
							deviceScaleFactor: 1
						});
						await page.evaluate((element) => {
							window.scrollTo(element.x, element.y);
						}, element);
						await page.screenshot({
							path: outputPath,
							type: 'png'
						});
						console.debug(`Saved ${outputPath}`);
					} catch (error) {
						console.log(error);
					}
					return Promise.resolve();
				}, Promise.resolve());
				await page.close();
			} catch (error) {
				console.log(error);
			}
		});
		return Promise.all(processes).catch((error) => {
			console.error(error);
		}).then(() => {
			browser.close();
		});
	} catch (error) {
		throw new Error(error);
	}
}

/**
 * Process tasks.
 * @param {object[]} tasks
 * @return {object} gulp stream
 */
function processTasks (tasks) {
	return tasks.map(function (task) {
		const folder = 'html';
		const filename = (task.file) ? task.file : '*.html';
		return GLOB.sync(PATH.join(FOLDERS.DIST, task.project, task.format, folder, filename)).map((file) => ({
			project: task.project,
			format: task.format,
			file: file
		}));
	}).flat();
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

GULP.task('build-book', GULP.parallel(
	'build-book-fonts',
	'build-book-scripts',
	'build-book-stylesheets',
	'build-book-images',
	'build-book-vendors',
	'build-book-html'
));
