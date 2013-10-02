/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require.config({
  baseUrl: '/js/lib',
  paths: {
    // Aliases
    wall: '../../wall/js',

    // Shims
    jquery: 'jquery-2.0.2.min',
    underscore: 'underscore-min',
    webL10n: 'l10n'
  },
  shim: {
    'underscore': { exports: '_' },
    'webL10n': { exports: 'document.webL10n' }
  }
});

require(['wall/wall-runner'], function (WallRunner) {
  var runner = new WallRunner(Parapara.wallName, Parapara.sessionId);
  runner.initialize();
});
