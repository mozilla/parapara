<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../lib/parapara.inc');
require_once('api.inc');
require_once('walls.inc');
require_once('utils.inc');

header('Content-Type: text/plain; charset=UTF-8');

// Check we are logged in
// XXX Factor this out to api.inc somewhere
session_name(WALLMAKER_SESSION_NAME);
session_start();
if (!isset($_SESSION['email'])) {
  bailWithError('logged-out');
}

// Prepare common parameters
$wallId    = toIntOrNull(@$_REQUEST['wallId']);
$sessionId = toIntOrNull(@$_REQUEST['sessionId']);
if (!$wallId)
  bailWithError('bad-request');

// If there is no sessionId, look for it in the request data
if (!$sessionId) {
  // XXX Factor this out to api.inc somewhere
  $handle = fopen('php://input','r');
  $jsonString = fgets($handle);
  $json = json_decode($jsonString,true);
  fclose($handle);
  $sessionId = toIntOrNull(@$json['sessionId']);
}
if (!$sessionId)
  bailWithError('bad-request');

// Get wall
$wall = Walls::getById($wallId, $_SESSION['email']);
if ($wall === null)
  bailWithError('not-found');

// Prepare change timestamp
$currentdatetime = gmdate("Y-m-d H:i:s");

// Determine action
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
  // Create new session
  $madeChange = $wall->startSession($sessionId, $currentdatetime);
} else if ($_SERVER['REQUEST_METHOD'] == 'PUT') {
  // Update session... in other words, close it
  $madeChange = $wall->endSession($sessionId, $currentdatetime);
}

// Prepare the result
// - If we made a change then return the latest session.
// - Otherwise return a parallel-change notification with the latest session 
//   in the detail.
$latestSession = $wall->latestSession;
if ($madeChange) {
  $result = $latestSession;
} else {
  $result['error_key'] = 'parallel-change';
  $result['error_detail'] = $latestSession;
}

// Return the result
print json_encode($result);

?>
