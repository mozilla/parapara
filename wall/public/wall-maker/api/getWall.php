<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../../lib/parapara.inc');
require_once('api.inc');
require_once('walls.inc');

header('Content-Type: text/plain; charset=UTF-8');

// Check we are logged in
session_name(WALLMAKER_SESSION_NAME);
session_start();
if (!isset($_SESSION['email'])) {
  bailWithError('logged-out');
}

// Parse input
$handle = fopen('php://input','r');
$jsonString = fgets($handle);
$json = json_decode($jsonString,true);
fclose($handle);

// Prepare parameters
$wallId = @$json['wallId'];
if (!isset($wallId)) {
  bailWithError('logged-out');
} else {
  try {
    $wall = getWallDetails($wallId, $_SESSION['email']);
  } catch (KeyedException $e) {
    bailWithError($e->getKey(), $e->getDetail());
  }
}

// Return the result
print json_encode($wall);
?>
