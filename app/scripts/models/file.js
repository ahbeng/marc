define([
	'jquery',
	'underscore',
	'backbone'
], function ($, _, Backbone) {
	'use strict';

	var File = Backbone.Model.extend({
		defaults: {
			source: '',
			path: '',
			metadata: {}
		}
	});

	return File;
});
