/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

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
  req.onreadystatechange = function() {
    if (req.readyState != 4)
      return;
    // 200 is for HTTP request, 0 is for local files (this allows us to test
    // without running a local webserver)
    if (req.status == 200 || req.status == 0) {
      try {
        var response = JSON.parse(req.responseText);
        if (response.error_key) {
          failureCallback(response.error_key, response.error_detail);
        } else {
          successCallback(JSON.parse(req.responseText));
        }
      } catch (e) {
        if (e instanceof SyntaxError) {
          console.debug("Error sending to server, could not parse response: "
            + req.responseText);
          failureCallback('server-fail');
        } else {
          throw e;
        }
      }
    } else {
      failureCallback('no-access')
    }
  };

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
      if (req.readyState != 0 && req.readyState != 4) {
        req.abort();
        failureCallback('timeout');
      }
    },
    ParaPara.XHR_TIMEOUT
  );

  ParaPara.abortRequest = function() {
    if (req.readyState != 0 && req.readyState != 4) {
      req.abort();
    }
  }
}

ParaPara.abortRequest = function() {}
