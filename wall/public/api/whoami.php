<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../lib/parapara.inc');
require_once('api.inc');
require_once('walls.inc');

header('Content-Type: text/plain; charset=UTF-8');

session_name(WALLMAKER_SESSION_NAME);
session_start();
if (isset($_SESSION['email'])) {
  print "{\"email\":\"" . $_SESSION['email'] . "\"}";
}
// If we're not logged in the output will be empty which will be easy to detect 
// as a failure
?>
