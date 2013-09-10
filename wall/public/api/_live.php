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
}
//   Otherwise find all events since provided id and just convert them as usual
//      (Later we can do a digest. e.g. if there is an add/remove_session, skip 
//       everything character/session-related in between)

ob_flush();
flush();

// XXX Remove
exit;

while (1) {
  // XXX Poll database

  // - add_character
  //   => add-character + look up info
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
  // (During loop, check that wall still exists? -- possibly check if count of 
  //  rows returned is less?)
  //
  // Update last ID
  //
  // Send ping comment if no changes in 2 seconds

  ob_flush();
  flush();
  sleep(1);

  echo "event: end\n";

  exit;
}

function getLastEventId() {
  $conn =& getDbConnection();

  $lastEventId =& $conn->queryOne(
      'SELECT IFNULL(MAX(changeId), 0) FROM changes LIMIT 1',
      'integer');
  checkDbResult($lastEventId);

  return $lastEventId;
}

?>
