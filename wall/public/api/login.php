<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once("../../lib/parapara.inc");
require_once("UriUtils.inc");
require_once("api.inc");
require_once("login.inc");
require_once("walls.inc");

header('Content-Type: application/json; charset=UTF-8');

// Verify request
$data = getRequestData();
if (!strlen(@$data["assertion"])) {
  error_log("No assertion provided for login");
  bailWithError('login-fail');
}

// Login
$email = login($data['assertion']);

print "{\"email\":\"" . $email . "\"}";

?>
