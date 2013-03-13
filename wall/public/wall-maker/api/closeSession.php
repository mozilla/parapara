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
$wallId    = @$json['wallId'];
$sessionId = @$json['sessionId'];
if (!isset($wallId) || !isset($sessionId)) {
  bailWithError('bad-request');
}

// Close session
$currentdatetime = gmdate("Y-m-d H:i:s");
$madeChange = closeLastSession($wallId, $sessionId, $currentdatetime);

// Return the result
// - If we made a change then return the latest session.
// - Otherwise return a parallel-change notification with the latest session in 
//   the detail.
$latestSession = getLatestSession($wallId);
if ($madeChange) {
  print json_encode($latestSession);
} else {
  $result['error_key'] = 'parallel-change';
  $result['error_detail'] = $latestSession;
  print json_encode($result);
}

?>
