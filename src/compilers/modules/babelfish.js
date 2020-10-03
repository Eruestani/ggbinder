'use strict';

const FOLDERS = require('../modules/folders.js');

module.exports = {
	insertMessages: insertMessages
};

/**
 * Insert translations into a chunk of html. Translations are gathered from project/format translations folders.
 * @param {object} html html DOM
 * @param {string} project project name
 * @param {string} format format name
 * @param {string} language country code (ISO 3166-1 alpha-2)
 * @return {object} html DOM
 */
function insertMessages (html, project, format, language) {
	const translations = FOLDERS.getFile(project, format, 'translations', `${language}.txt`);
	if (translations) {
		html.documentElement.setAttribute('data-language', language);
		html.body.innerHTML = html.body.innerHTML.replace(/{{msg:(.*?)}}/g, function (match, p1) {
			const message = translations.match(new RegExp(`${p1}=(.*?)$`, 'm'));
			return message ? message[1] : match;
		});
	}
	return html;
}
