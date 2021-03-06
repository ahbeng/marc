/*global require*/
'use strict';

require.config({
    shim: {
        underscore: {
            exports: '_'
        },
        backbone: {
            deps: [
                'underscore',
                'jquery'
            ],
            exports: 'Backbone'
        },
        codemirror: {
            exports: 'CodeMirror'
        },
        jqTree: {
            deps: ['jquery']
        },
        bootstrap: {
            deps: ['jquery']
        },
        matchbrackets: {
            deps: ['codemirror']
        },
        foldcode: {
            deps: ['codemirror']
        },
        foldgutter: {
            deps: ['foldcode']
        },
        'match-highlighter': {
            deps: ['codemirror']
        },
        'brace-fold': {
            deps: ['foldgutter']
        },
        'comment-fold': {
            deps: ['foldgutter']
        },
        'indent-fold': {
            deps: ['foldgutter']
        },
        'xml-fold': {
            deps: ['foldgutter']
        },
        matchtags: {
            deps: ['xml-fold']
        },
        'active-line': {
            deps: ['codemirror']
        },
        'bootstrap-switch': {
            deps: ['jquery']
        },
        'dropbox': {
            exports: 'Dropbox'
        },
        'bootstrap-select': {
            deps: ['jquery']
        }
    },
    paths: {
        jquery: '../bower_components/jquery/jquery',
        backbone: '../bower_components/backbone/backbone',
        underscore: '../bower_components/lodash/dist/lodash',
        codemirror: 'vendor/codemirror',
        jqTree: '../bower_components/jqtree/tree.jquery',
        snap: '../bower_components/snapjs/snap',
        enquire: '../bower_components/enquire/dist/enquire',
        bootstrap: '../bower_components/bootstrap/dist/js/bootstrap',
        matchbrackets: '../bower_components/codemirror/addon/edit/matchbrackets',
        foldcode: '../bower_components/codemirror/addon/fold/foldcode',
        foldgutter: '../bower_components/codemirror/addon/fold/foldgutter',
        'match-highlighter': '../bower_components/codemirror/addon/search/match-highlighter',
        'brace-fold': '../bower_components/codemirror/addon/fold/brace-fold',
        'comment-fold': '../bower_components/codemirror/addon/fold/comment-fold',
        'indent-fold': '../bower_components/codemirror/addon/fold/indent-fold',
        'xml-fold': '../bower_components/codemirror/addon/fold/xml-fold',
        matchtags: '../bower_components/codemirror/addon/edit/matchtags',
        'active-line': '../bower_components/codemirror/addon/selection/active-line',
        dropbox: 'vendor/dropbox',
        'bootstrap-switch': '../bower_components/bootstrap-switch/static/js/bootstrap-switch',
        'bootstrap-select': '../bower_components/bootstrap-select/bootstrap-select',
        spinner: '../bower_components/spin.js/spin'
    }
});

var SCHEMA_VERSION = '0.0.3';

require([
    'jquery',
    'underscore',
    'backbone',
    'views/sidebar',
    'collections/fileList',
    'routes/application',
    'routes/services',
    'models/file',
    'snap',
    'enquire',
    'vendor/fastclick',
    'services/FileLoader',
    'services/file',
    'LSD',
    'context',
    'views/settingspane',
    'services/gitAuth',
    'bootstrap',
    'jqTree',
    'dropbox',
    'bootstrap-switch',
    'bootstrap-select'
], function ($, _, Backbone, Sidebar, FileList, ApplicationRouter, ServicesRouter, File, Snap, enquire, FastClick, FileLoader, FileService, LSD, Context, SettingsPaneView, GitAuthService) {
    // Clear local storage if schema has breaking changes.
    if (LSD.getItem('v') !== SCHEMA_VERSION) {
        LSD.clear();
        LSD.setItem('v', SCHEMA_VERSION);
        location.hash = '';
    }

    new ApplicationRouter();
    new ServicesRouter();
    Backbone.history.start();

    FileLoader.listenTo(FileList, 'add', FileLoader.loadFilesAsync);
    FileLoader.listenTo(FileList, 'remove', FileLoader.fileListUpdated);
    FileLoader.listenTo(FileList, 'change', FileLoader.fileListUpdated);
    $(document).on('online', _.bind(FileLoader.appOnline, FileLoader));
    $(document).on('offline', _.bind(FileLoader.appOffline, FileLoader));

    enquire.register('screen and (min-width: 768px)', {
        openSnapper: function (side) {
            if (this.matched) {
                this.$snapContent.css(side, 0);
                this.$snapContent.css(side === 'left' ? 'right' : 'left', '266px');
            }
            this.snapper.open(side);
        },
        closeSnapper: function () {
            if (this.matched) {
                this.$snapContent.css({
                    left: 0,
                    right: 0
                });
            }
            this.snapper.close();
        },
        toggleSnapper: function (snapper, side) {
            return function () {
                if (snapper.state().state === side) {
                    this.closeSnapper();
                } else {
                    this.openSnapper(side);
                }
            };
        },
        setup: function () {
            this.$snapContent = $('.snap-content');
            this.snapper = new Snap({
                element: document.getElementById('content')
            });
            $('.navbar-tree').click(_.bind(
                this.toggleSnapper(this.snapper, 'left'), this));
            $('.navbar-settings').click(_.bind(
                this.toggleSnapper(this.snapper, 'right'), this));
        },
        match: function () {
            this.snapper.disable();
            this.matched = true;
            this.openSnapper('left');
        },
        unmatch: function () {
            this.closeSnapper();
            this.matched = false;
            this.snapper.enable();
        }
    });

    var sidebar = new Sidebar({
        el: '.snap-drawer-left',
        collection: FileList
    });

    Context.getInstance().setSidebar(sidebar);

    FastClick.attach(document.body);

    $('#delete-file-btn').click(function () {
        FileService.deleteFile();
    });

    $('#update-file-btn').click(function () {
        FileService.updateFile();
    });

    var token = LSD.getItem('oauthToken');
    var isTokenValid = typeof token !== 'undefined' && token !== null;
    if (isTokenValid) {
        $('#github-log-in').addClass('disabled');
        $('#github-log-in').text('Hooray, you\'re logged in!');
    } else {
        $('#github-log-in').click(function () {
            GitAuthService.getInstance().ensureAuth(function () {
                alert('You\'re now logged in with GitHub!');
                FileLoader.startPeriodicSyncing();
            }, false);
        });
    }

    // Enable bootstrap select
    $('.selectpicker').selectpicker('mobile');

});
