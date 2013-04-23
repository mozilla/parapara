<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../lib/parapara.inc');
require_once('api.inc');
require_once('walls.inc');
require_once('login.inc');
require_once('utils.inc');

header('Content-Type: application/json; charset=UTF-8');

// Check we are logged in
$email = getUserEmail();

// Prepare common parameters
$wallId    = toIntOrNull(@$_REQUEST['wallId']);
$sessionId = toIntOrNull(@$_REQUEST['sessionId']);
if (!$wallId)
  bailWithError('bad-request');

// If there is no sessionId, look for it in the request data
if (!$sessionId) {
  $data = getRequestData();
  $sessionId = toIntOrNull(@$data['sessionId']);
}

// Get wall
$wall = Walls::getById($wallId, $email);
if ($wall === null)
  bailWithError('not-found');

// Prepare change timestamp
$currentdatetime = gmdate("Y-m-d H:i:s");

// Determine action
switch ($_SERVER['REQUEST_METHOD']) {
  case 'GET':
    $result = $wall->getSessions();
    break;

  case 'POST':
    if (!$sessionId)
      bailWithError('bad-request');
    // Create new session
    $madeChange = $wall->startSession($sessionId, $currentdatetime);
    break;

  case 'PUT':
    if (!$sessionId)
      bailWithError('bad-request');
    // Update session... in other words, close it
    $madeChange = $wall->endSession($sessionId, $currentdatetime);
    break;
}

// Prepare the result for when we updated the latest session
// - If we made a change then return the latest session.
// - Otherwise return a parallel-change notification with the latest session 
//   in the detail.
if (isset($madeChange)) {
  $latestSession = $wall->latestSession;
  if ($madeChange) {
    $result = $latestSession;
  } else {
    $result['error_key'] = 'parallel-change';
    $result['error_detail'] = $latestSession;
  }
}

// Return the result
print json_encode($result);

?>
