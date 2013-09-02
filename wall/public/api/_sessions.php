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
$email = getAndRequireUserEmail();

// Prepare common parameters
$wall = getRequestedWall($email);
if ($wall === "Not specified")
  bailWithError('bad-request');
if ($wall === null)
  bailWithError('wall-not-found');
$sessionId = toIntOrNull(@$_REQUEST['sessionId']);

// Prepare change timestamp
$currentdatetime = gmdate("Y-m-d H:i:s");

// Determine action
switch ($_SERVER['REQUEST_METHOD']) {
  case 'GET':
    // We currently don't support getting a specific session
    if ($sessionId)
      bailWithError('bad-request');

    $result = $wall->getSessions();
    break;

  case 'POST':
    // You can't create a specific session
    if ($sessionId)
      bailWithError('bad-request');

    // Get latest session ID for clients who wish to prevent parallel changes
    $data = getRequestData();
    $latestSessionId = @$data['latestSessionId'];
    $latestSessionId = isset($latestSessionId)
      ? is_null($latestSessionId) ? null : intval($latestSessionId)
      : "Not set";

    // Create new session
    $madeChange = $wall->startSession($currentdatetime, $latestSessionId);
    break;

  case 'PUT':
    if (!$sessionId)
      bailWithError('bad-request');

    // Check if we are ending the session of re-opening it
    $data = getRequestData();
    $close = !!@$data['end'];

    // Make the change
    $madeChange = $close
                ? $wall->endSession($currentdatetime, $sessionId)
                : $wall->restartSession($sessionId);

    break;

  case 'DELETE':
    if (!$sessionId)
      bailWithError('bad-request');

    // Check for flags
    $data = getRequestData();
    $deleteMode = $data && @$data['keepCharacters']
                ? CharacterDeleteMode::DeleteRecordOnly
                : CharacterDeleteMode::DeleteAll;

    // Delete
    $wall->deleteSession($sessionId, $deleteMode);

    // Prepare changed fields as a result
    $result = array(
      'status' => $wall->status,
      'latestSession' => $wall->latestSession
    );
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
