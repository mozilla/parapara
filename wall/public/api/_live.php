<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../lib/parapara.inc');
require_once('api.inc');
require_once('walls.inc');
require_once('utils.inc');

header('Content-Type: text/event-stream; charset=UTF-8');
header('Cache-Control: no-cache');

// Check for wall
$wall = getRequestedWall();
if ($wall === null || $wall == "Not specified") {
  dispatchRemoveWallEventAndExit();
}

// Allow script to run indefinitely
set_time_limit(0);

// Store initial time so we know when we need to send a ping comment
$lastSendTime = time();

// Send an initial sync event
// (This is useful even on resuming since various factors such as the computer 
// going to sleep may have caused it to drift from the server.)
echo "event: sync-progress\n";
echo "data: " . $wall->getCurrentProgress() . "\n\n";

// Check for a last event ID
if (!array_key_exists('HTTP_LAST_EVENT_ID', $_SERVER) ||
    !is_numeric($_SERVER['HTTP_LAST_EVENT_ID']) ||
    ($lastEventId = intval($_SERVER['HTTP_LAST_EVENT_ID'])) < 0) {

  // If no valid last event ID is specified we generate events with details of 
  // the latest session
  $lastEventId = getLastEventId();

  // Start session
  echo "id: " . getLastEventId() . "\n";
  echo "event: start-session\n";
  echo "data:\n\n";

  // Add characters for latest session
  dispatchAddCharacterEventsForLatestSession($wall);

  // Flush output...
  ob_flush();
  flush();

  // ... then wait before checking for changes
  sleep(1);
}

while (!connection_aborted()) {
  // Poll database for changes
  $conn =& getDbConnection();
  $res =& $conn->query(
      'SELECT changeId, changeType, sessionId, contextId FROM changes'
      . ' WHERE wallId = ' . $conn->quote($wall->wallId, 'integer')
      . ' AND changeId > ' . $conn->quote($lastEventId, 'integer'));
  if (MDB2::isError($res)) {
    error_log($res->getMessage() . ', ' . $res->getDebugInfo());
    $conn->disconnect();
    break;
  }

  // Update wall session information
  // (This allows us to skip dispatching events for characters that belong to 
  // a session that is not (or no longer) the latest.)
  if ($res->numRows()) {
    $wall->updateLatestSession();
  }

  // Dispatch events
  $conn->setFetchMode(MDB2_FETCHMODE_ASSOC);
  while ($row = $res->fetchRow()) {
    dispatchEventFromChange($row);
    $lastEventId = $row['changeid'];
    $lastSendTime = time();
  }
  $conn->disconnect();

  // Send ping comment if there are no changes in 10 seconds
  if (time() - $lastSendTime >= 10) {
    // Check if the wall has disappeared
    if (!Walls::getById($wall->wallId)) {
      dispatchRemoveWallEventAndExit();
    }

    // Otherwise just send a ping comment
    echo ":ping\n\n";
    $lastSendTime = time();
  }

  // Flush buffers
  ob_flush();
  flush();

  // Wait so we don't put too much load on the database
  sleep(1);
}

function getLastEventId() {
  $conn =& getDbConnection();

  $lastEventId =& $conn->queryOne(
      'SELECT IFNULL(MAX(changeId), 0) FROM changes LIMIT 1',
      'integer');
  checkDbResult($lastEventId);
  $conn->disconnect();

  return $lastEventId;
}

// Changes have the following format:
//  changeid
//  changetype
//  sessionid
//  contextid
function dispatchEventFromChange($change) {
  global $wall;

  // For character-related events, we skip them if they are from a session that 
  // is not the latest
  $sessionIsLatest =
    $wall->latestSession &&
    isset($change['sessionid']) &&
    intval($change['sessionid']) == $wall->latestSession['sessionId'];

  switch ($change['changetype']) {
    case 'add-character':
    case 'show-character':
      if ($sessionIsLatest) {
        dispatchAddCharacterEvent($change['contextid'], $change['changeid']);
      }
      break;

    case 'remove-character':
    case 'hide-character':
      if ($sessionIsLatest) {
        dispatchRemoveCharacterEvent($change['contextid'], $change['changeid']);
      }
      break;

    case 'add-session':
      dispatchStartSessionEvent($change['contextid'], $change['changeid']);
      break;

    case 'remove-session':
      // Only send events if the session that was deleted was more recent that 
      // the current session
      if (!$wall->latestSession ||
          $wall->latestSession['sessionId'] < intval($change['sessionid'])) {
        dispatchStartSessionEvent($change['contextid'], $change['changeid']);
        dispatchAddCharacterEventsForLatestSession($wall);
      }
      break;

    case 'change-duration':
      dispatchChangeDurationEvent($change['changeid']);
      break;

    case 'change-design':
      dispatchChangeDesignEvent($change['changeid']);
      break;

    default:
      error_log("Unrecognized change type: " . $change['changetype']);
      break;
  }
}

function dispatchAddCharacterEvent($charId, $changeId) {
  // Ignore errors. It may be that the character has been deleted since
  try {
    $char = Characters::getById($charId);
    if (!$char) // Character has since been deleted
      return;

    // Dispatch event
    echo "id: $changeId\n";
    echo "event: add-character\n";
    echo "data: " . json_encode($char->asArray()) . "\n\n";
  } catch (Exception $e) { /* Ignore */ }
}

function dispatchAddCharacterEventsForLatestSession($wall) {
  try {
    $latestSessionId = $wall->latestSession
                     ? $wall->latestSession['sessionId']
                     : null;
    if ($latestSessionId) {
      $characters = Characters::getBySession($wall->wallId, $latestSessionId);
      foreach($characters as $char) {
        echo "event: add-character\n";
        echo "data: " . json_encode($char->asArray()) . "\n\n";
      }
    }
  } catch (Exception $e) { /* Ignore */ }
}

function dispatchRemoveCharacterEvent($charId, $changeId) {
  global $wall;

  // Skip events for characters that still exist but don't belong to the latest 
  // session.
  //
  // We'd really like to skip events for characters that have been deleted and 
  // which don't belong to the latest session but that would require storing the
  // session ID of deleted characters in the change database.
  $char = Characters::getById($charId);
  if ($char && $char->sessionId !== $wall->latestSession['sessionId'])
    return;

  echo "id: $changeId\n";
  echo "event: remove-character\n";
  echo "data: $charId\n\n";
}

function dispatchStartSessionEvent($sessionId, $changeId) {
  echo "id: $changeId\n";
  echo "event: start-session\n";
  echo "data: $sessionId\n\n";
}

function dispatchChangeDurationEvent($changeId) {
  // Update the wall with the new information
  global $wall;
  $wall = Walls::getById($wall->wallId);
  if (!$wall) {
    dispatchRemoveWallEventAndExit();
  }
  $duration = $wall->duration ? $wall->duration : $wall->defaultDuration;

  echo "id: $changeId\n";
  echo "event: change-duration\n";
  echo "data: " . $duration . "\n\n";
}

function dispatchChangeDesignEvent($changeId) {
  echo "id: $changeId\n";
  echo "event: change-design\n";
  echo "data:\n\n";
}

function dispatchRemoveWallEventAndExit() {
  echo "event: remove-wall\n";
  echo "data:\n\n";
  ob_flush();
  flush();
  exit;
}

?>
