'use strict';

const FOLDERS = require('./../modules/folders.js');

module.exports = {
	setWebsiteWrapper: setWebsiteWrapper,
	formatPages: formatPages,
	setPageClass: setPageClass
};

/**
 * Set website wrapper.
 * @param {string} project
 * @param {string} format
 * @param {string} wrapper
 * @param {object} html DOM
 * @return {object} html DOM
 */
function setWebsiteWrapper (project, format, wrapper, html) {
	let filename = html.querySelector('html').getAttribute('data-wrapper');
	filename = filename ? filename : wrapper;
	try {
		const file = FOLDERS.getFile(project, format, 'wrappers', `${filename}.html`);
		html.querySelector('html').innerHTML = file.replace(/(<div class=['"]webpage__body.*?>)(\s*?)(<\/div>)/s, `$1$2${html.querySelector('body').innerHTML}$3`);
	} catch (error) {
		console.error(error);
	}
	return html;
}

/**
 * Remove colbreaks.
 * @param {object} html DOM
 * @return {object} html DOM
 */
function removeColbreaks (html) {
	html.querySelectorAll('col-break').forEach(function (element) {
		element.parentNode.removeChild(element);
	});
	return html;
}

/**
 * Merge pages.
 * @param {object} html DOM
 * @return {object} html DOM
 */
function mergePages (html) {
	const body = html.querySelector('.webpage__body');
	html.querySelectorAll('.webpage__body .page').forEach(function (element) {
		while (element.childNodes.length > 0) {
			body.appendChild(element.childNodes[0]);
		}
		element.parentNode.removeChild(element);
	});
	html.querySelectorAll('.book').forEach(function (element) {
		element.parentNode.removeChild(element);
	});
	return html;
}

/**
 * Set page class.
 * @param {object} html DOM
 * @param {string} cssClass
 * @return {object} html DOM
 */
function setPageClass (html, cssClass) {
	html.querySelector(`.webpage__body`).classList.add(cssClass);
	return html;
}

/**
 * Format pages.
 * @param {object} html DOM
 * @param {string} index
 * @return {object} html DOM
 */
function formatPages (html, index) {
	removeColbreaks(html);
	mergePages(html);
	return html;
}
