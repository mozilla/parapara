/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require.config({
  baseUrl: '/js/lib',
  paths: {
    wallmaker: '../../wall-maker/js',
    templates: '../../wall-maker/templates',
    jquery: 'jquery-2.0.2.min',
    underscore: 'underscore-min',
    backbone: 'backbone-min',
    // XXX This is just a temporary measure until we write a proper module for
    // this
    ParaParaXHR: '../../wall-maker/js/xhr'
  },
  shim: {
    'underscore': {
      exports: '_'
    },
    'backbone': {
      deps: ['underscore', 'jquery', 'json2'],
      exports: 'Backbone'
    },
    'ParaParaXHR': {
      exports: 'ParaPara'
    }
  }
});

require(['wallmaker/wallmaker'], function (wallmaker) {
  wallmaker.init();
});
