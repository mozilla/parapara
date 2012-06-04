/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * XXX Move this to somewhere we can share with the editor
 */

var ParaPara = ParaPara || {};

ParaPara.XHR_TIMEOUT = 8000;

ParaPara.postRequest = function(url, payload, successCallback,
                                failureCallback) {
  // Create JSON payload
  var json = JSON.stringify(payload);

  // Create request
  var req = new XMLHttpRequest();
  req.open("POST", url, true);

  // Set headers
  req.setRequestHeader("Content-Type", "application/json");

  // Event listeners
  req.addEventListener("load",
    function(evt) {
      var xhr = evt.target;
      // 200 is for HTTP request, 0 is for local files (this allows us to test
      // without running a local webserver)
      if (xhr.status == 200 || xhr.status == 0) {
        try {
          var response = JSON.parse(xhr.responseText);
          if (response.error_key) {
            failureCallback(response.error_key, response.error_detail);
          } else {
            successCallback(JSON.parse(xhr.responseText));
          }
        } catch (e) {
          if (e instanceof SyntaxError) {
            console.debug("Error sending to server, could not parse response: "
              + xhr.responseText);
            failureCallback('server-fail');
          } else {
            throw e;
          }
        }
      } else {
        failureCallback('no-access')
      }
    }, false);
  req.addEventListener("error", function() { failureCallback('no-access'); },
                       false);

  // Send away
  try {
    req.send(json);
  } catch (e) {
    console.debug(e);
    failureCallback('send-fail');
    return;
  }

  // Add timeout
  window.setTimeout(
    function() {
      if (req.readyState != 4) {
        req.abort();
        failureCallback('timeout');
      }
    },
    ParaPara.XHR_TIMEOUT
  );
}
