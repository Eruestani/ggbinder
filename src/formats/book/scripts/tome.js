/* eslint no-invalid-this: "off" */

'use strict';

const Tome = {

	initialise: function () {
		// Mark document as loaded (reference by Puppeteer)
		$('html').addClass('document-loaded');
	}
};
