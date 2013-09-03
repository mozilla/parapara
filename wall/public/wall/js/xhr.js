/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * XXX Temporarily restoring this until we switch over to jQuery or something
 * else
 */

var ParaPara = ParaPara || {};

ParaPara.XHR_DEFAULT_TIMEOUT = 8000;

ParaPara.getUrl = function(url, successCallback, failureCallback,
                           maxTries, timeout) {
  if (typeof maxTries === "undefined")
    /* GET is indempotent so by default we retry twice */
    maxTries = 2;
  if (typeof timeout === "undefined")
    timeout = ParaPara.XHR_DEFAULT_TIMEOUT;

  new ParaPara.XHRequest("GET", url, null,
                         successCallback, failureCallback,
                         maxTries, timeout);
}

ParaPara.postUrl = function(url, payload,
                            successCallback, failureCallback,
                            maxTries, timeout) {
  if (typeof maxTries === "undefined")
    maxTries = 1;
  if (typeof timeout === "undefined")
    timeout = ParaPara.XHR_DEFAULT_TIMEOUT;

  new ParaPara.XHRequest("POST", url, payload,
                         successCallback, failureCallback,
                         maxTries, timeout);
}

ParaPara.putUrl = function(url, payload, successCallback, failureCallback,
                           maxTries, timeout) {
  if (typeof maxTries === "undefined")
    maxTries = 1;
  if (typeof timeout === "undefined")
    timeout = ParaPara.XHR_DEFAULT_TIMEOUT;

  new ParaPara.XHRequest("PUT", url, payload,
                         successCallback, failureCallback,
                         maxTries, timeout);
}

ParaPara.XHRequest = function(method, url, payload,
                              successCallback, failureCallback,
                              maxTries, timeout) {
  this.timeoutCount    = 0;
  this.gotResponse     = false;
  this.method          = method;
  this.url             = url;
  this.successCallback = successCallback;
  this.failureCallback = failureCallback;
  this.maxTries        = maxTries;
  this.timeout         = timeout;

  // Create JSON payload
  this.jsonPayload = JSON.stringify(payload);

  // Send
  this.sendRequest();
};

ParaPara.XHRequest.prototype.sendRequest = function() {
  // Create request
  var req = new XMLHttpRequest();
  req.open(this.method, this.url, true);

  // Set headers
  if (this.jsonPayload)
    req.setRequestHeader("Content-Type", "application/json");

  // Event listeners
  req.onreadystatechange = function() {
    // Check we haven't already got a response to this request
    if (this.gotResponse) {
      req.abort(); // This is not really necessary but may save some resources
                   // in some cases
      return;
    }
    if (req.readyState != 4)
      return;
    this.gotResponse = true;
    if (req.status == 200) {
      try {
        var response = JSON.parse(req.responseText);
        if (response.error_key) {
          this.failureCallback(response.error_key, response.error_detail);
        } else {
          this.successCallback(JSON.parse(req.responseText));
        }
      } catch (e) {
        if (e instanceof SyntaxError) {
          console.debug("Error sending to server, could not parse response: "
            + req.responseText);
          this.failureCallback('server-fail');
        } else {
          throw e;
        }
      }
    } else {
      this.failureCallback('no-access');
    }
  }.bind(this);

  // Send away
  try {
    req.send(this.jsonPayload ? this.jsonPayload : null);
  } catch (e) {
    console.debug(e);
    this.failureCallback('send-fail');
    return;
  }

  // Add timeout
  window.setTimeout(
    function() {
      if (req.readyState != 4) {
        this.timeoutCount++;
        // Case 1: Timed out, but it doesn't matter since another request got
        // through.
        if (this.gotResponse) {
          req.abort();

        // Case 2: Timed out and we've reached out limit of retries
        } else if (this.timeoutCount >= this.maxTries) {
          // We're giving up so set the flag that says we've already got
          // a response. That way, any requests hanging around will be ignored
          // if they return.
          //
          // Also, calling abort will trigger a readystatechange event so we
          // need to set the flag here so we ignore that event.
          this.gotResponse = true;
          req.abort();
          this.failureCallback('timeout');

        // Case 3: Timed out, but we can still retry
        } else {
          // We DON'T abort 'req' at this point because we often arrive at the
          // following situation:
          //
          // a) set timeout to, say, 8s
          // b) wifi network is slow and response time is roughly 10s
          //
          // If we cancel the first request at 8s, no matter how many times we
          // retry we'll never get an answer. Instead we let the timed out
          // requests continue and if they do return then we'll detect at that
          // point if we've already received a response.
          this.sendRequest();
        }
      }
    }.bind(this),
    this.timeout
  );
};
