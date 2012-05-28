<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once("../../../lib/parapara.inc");
require_once("db.inc");

header("Content-Type: text/plain; charset=UTF-8");

// Check we are logged in
session_start();
if (!isset($_SESSION['email'])) {
  print "{\"error_key\":\"logged-out\"}";
  exit();
}

?>
