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

echo "event: start-session\n\n";
ob_flush();
flush();

exit;

// XXX Check for wall
//  ==> remove-wall

// XXX Check for last event ID
//   No last event ID
//      If no last event ID:
//         -> output ID first
//         -> add-session + add-character * n
//      Update last ID
//   Otherwise find all events since provided id and just convert them as usual
//      (Later we can do a digest. e.g. if there is an add/remove_session, skip 
//       everything character/session-related in between)

// XXX Flush

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

?>
