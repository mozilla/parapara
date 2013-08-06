/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require.config({
  baseUrl: '/js/lib',
  paths: {
    wallmaker: '../../wall-maker/js',
    collections: '../../wall-maker/js/collections',
    models: '../../wall-maker/js/models',
    templates: '../../wall-maker/templates',
    utils: '../../wall-maker/js/utils',
    views: '../../wall-maker/js/views',
    // Shims
    backbone: 'backbone',
    bootstrap: 'bootstrap.min',
    jquery: 'jquery-2.0.2.min',
    underscore: 'underscore-min',
    soma: 'soma-template',
    qrcode: 'qrcode',
    webL10n: 'l10n'
  },
  shim: {
    'backbone': {
      deps: ['underscore', 'jquery', 'json2'],
      exports: 'Backbone'
    },
    'bootstrap': {
      deps: ['jquery']
    },
    'underscore': {
      exports: '_'
    },
    'soma': {
      exports: 'soma'
    },
    'qrcode': {
      exports: 'QRCode'
    },
    'webL10n': {
      exports: 'document.webL10n'
    }
  }
});

require(['wallmaker/wallmaker'], function (wallmaker) {
  wallmaker.initialize();
});
