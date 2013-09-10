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
  echo "event: remove-wall\n\n";
  ob_flush();
  flush();
  exit;
}

// Allow script to run indefinitely
set_time_limit(0);

// No last event ID
{ 
  // Start session
  echo "id: " . getLastEventId() . "\n";
  echo "event: start-session\n\n";

  // Get characters for latest session
  $latestSessionId = $wall->latestSession
                   ? $wall->latestSession['sessionId']
                   : null;
  if ($latestSessionId) {
    $characters = Characters::getBySession($wall->wallId, $latestSessionId);
    foreach($characters as $character) {
      echo "event: add-character\n";
      echo "data: " . json_encode($character->asArray()) . "\n\n";
    }
  }
  $lastEventId = 0;
}
//   Otherwise find all events since provided id and just convert them as usual
//      (Later we can do a digest. e.g. if there is an add/remove_session, skip 
//       everything character/session-related in between)

$lastSendTime = time();
ob_flush();
flush();

while (!connection_aborted()) {
  sleep(1);

  // Poll database for changes
  $conn =& getDbConnection();
  $res =& $conn->query(
      'SELECT changeId, changeType, contextId FROM changes'
      . ' WHERE wallId = ' . $conn->quote($wall->wallId, 'integer')
      . ' AND changeId > ' . $conn->quote($lastEventId, 'integer'));
  if (MDB2::isError($res)) {
    error_log($res->getMessage() . ', ' . $res->getDebugInfo());
    $conn->disconnect();
    break;
  }

  // Dispatch events
  $conn->setFetchMode(MDB2_FETCHMODE_ASSOC);
  while ($row = $res->fetchRow()) {
    dispatchEventFromChange($row);
    $lastEventId = $row['changeid'];
    $lastSendTime = time();
  }
  $conn->disconnect();

  // XXX Check that wall still exists and dispatch remove-wall somehow?

  // Send ping comment if there are no changes in 10 seconds
  if (time() - $lastSendTime >= 10) {
    echo ":ping\n";
    $lastSendTime = time();
  }

  ob_flush();
  flush();
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
//  contextid
function dispatchEventFromChange($change) {
  switch ($change['changetype']) {
    case 'add-character':
      dispatchAddCharacterEvent($change['contextid'], $change['changeid']);
      break;

    default:
      error_log("Unrecognized change type: " . $change['changetype']);
      break;
  }
  // - show_character + char id
  //   => add-character + look up info
  // - hide_character + char id
  //   => remove-character
  // - remove_character + char id
  //   => remove-character
  // - add_session + session id
  //   => start-session
  // - remove_session + session id
  //   => start-session + add-character * n
  // - change_duration
  //   => change-duration + duration
  // - change_design
  //   => change-design
}

function dispatchAddCharacterEvent($charId, $changeId) {
  // Ignore errors. It may be that the character has been deleted since
  try {
    $char = Characters::getById($charId);
    if ($char) {
      echo "id: $changeId\n";
      echo "event: add-character\n";
      echo "data: " . json_encode($char->asArray()) . "\n\n";
    }
  } catch (Exception $e) { /* Ignore */ }
}

?>
