/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ ],
function () {
  return function($, login) {
    $.ajaxPrefilter(function (options, originalOptions, jqXHR) {
      // Automatically look for 'error_key' in the response object and if it's
      // there, turn the response into an error
      if (options.checkForErrors) {
        var deferred  = $.Deferred();

        jqXHR.then(
          function(data, statusText, jqXHR) {
            if (data.error_key) {
              if (login && options.autoLogout &&
                  data.error_key == 'logged-out') {
                login.logout();
              } else {
                deferred.rejectWith(this,
                  [ jqXHR, data.error_key, data.error_detail ]);
              }
            } else {
              deferred.resolveWith(this, [ data, statusText, jqXHR ]);
            }
          },
          deferred.reject);

        deferred.promise(jqXHR);
        jqXHR.success = jqXHR.done;
        jqXHR.error = jqXHR.fail;
      }

      // All our interfaces pass JSON data so if automatic string-conversion
      // hasn't already been applied, convert to JSON here
      if (typeof options.data === "object") {
        options.data = JSON.stringify(options.data);
        options.contentType = "application/json";
      }
    });
  };
});
