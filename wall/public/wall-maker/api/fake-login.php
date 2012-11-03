<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once("../../../lib/parapara.inc");
require_once("UriUtils.inc");
require_once("api.inc");
require_once("walls.inc");

header("Content-Type: text/plain; charset=UTF-8");

// Destroy any previous session
session_name(WALLMAKER_SESSION_NAME);
session_start();
session_regenerate_id(TRUE);
$_SESSION = array();
assert(!isset($_SESSION['email']));

$email = "dadaa@minism.jp";
$_SESSION['email'] = $email;
print "{\"email\":\"" . $email . "\"}";
