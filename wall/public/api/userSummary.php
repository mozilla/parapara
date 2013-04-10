<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../lib/parapara.inc');
require_once('api.inc');
require_once('walls.inc');
require_once('login.inc');

header('Content-Type: application/json; charset=UTF-8');

// Check we are logged in
$email = getUserEmail();

// Get walls
$walls = getWallSummaryForUser($email);
if ($walls === null) {
  bailWithError('db-error');
}
$result['walls'] = $walls;

// Get designs
$result['designs'] = getDesignSummary();

// Return the result
print json_encode($result);

?>
