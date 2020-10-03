'use strict';

const FOLDERS = require('./folders.js');

module.exports = {
	formatPages: formatPages,
	setBookWrapper: setBookWrapper
};

/**
 * Wrap html DOM in a book wrapper file.
 * @param {string} project name
 * @param {string} format
 * @param {string} wrapper
 * @param {object} html DOM
 * @return {object} html DOM
 */
function setBookWrapper (project, format, wrapper, html) {
	let filename = html.querySelector('html').getAttribute('data-wrapper');
	filename = filename ? filename : wrapper;
	try {
		const file = FOLDERS.getFile(project, format, 'wrappers', `${filename}.html`);
		html.querySelector('html').innerHTML = file.replace(/<book.*?>.*<\/book>/s, html.querySelector('body').innerHTML);
	} catch (error) {
		console.error(error);
	}
	return html;
}

/**
 * Format pages.
 * @param {object} html DOM
 * @return {object} html
 */
function formatPages (html) {
	return html;
}
