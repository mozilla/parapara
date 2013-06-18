/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

requirejs.config({
    baseUrl: '/js/lib',
    paths: {
        wallmaker: '../../wall-maker/js',
        jquery: 'jquery-2.0.2.min',
        underscore: 'underscore-min',
        backbone: 'backbone-min'
    },
    shim: {
        'underscore': {
            exports: '_'
        },
        'backbone': {
            deps: ['underscore', 'jquery', 'json2'],
            exports: 'Backbone'
        }
    }
});

requirejs(['jquery', 'backbone', 'wallmaker/login'],
function ($, backbone, login) {
  alert(backbone);
});
