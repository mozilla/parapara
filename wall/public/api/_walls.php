<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../lib/parapara.inc');
require_once('api.inc');
require_once('login.inc');
require_once('walls.inc');
require_once('utils.inc');

header('Content-Type: text/plain; charset=UTF-8');

// Check we are logged in
$email = getUserEmail();

// Prepare common parameters
$wallId = toIntOrNull(@$_REQUEST['id']);

// Parse input
$data = getRequestData();

switch ($_SERVER['REQUEST_METHOD']) {
  case 'POST':
    // Create wall
    $name     = @$data['name'];
    $designId = @$data['design'];
    $wall     = Walls::create($name, $designId, $email);

    // Start session
    $currentdatetime = gmdate("Y-m-d H:i:s");
    $wall->startSession(null, $currentdatetime);

    // Prepare result
    $result = $wall->asArray();
    break;

  case 'GET':
    if ($wallId === null) {
      // XXX Return the list of walls here
      bailWithError('bad-request');
    }
    $wall = Walls::getById($wallId, $email);
    if ($wall === null)
      bailWithError('not-found');

    // Walls::getById will filter out sensitive information if the supplied 
    // email address does not have access to administer the wall.
    //
    // However, for now we disallow all access if the user doesn't have 
    // administration rights since a user may want to keep their event private 
    // from others for various reasons.
    //
    // In the future we will probably fine tune this so that walls which are 
    // marked for display in the public gallery can be reached from this API 
    // since we won't be exposing any information via this API that isn't 
    // available by browsing the gallery.
    if (!$wall->canAdminister())
      bailWithError('no-auth');

    $result = $wall->asArray();
    break;

  case 'PUT':
    if ($wallId === null)
      bailWithError('bad-request');

    // Get wall
    $wall = Walls::getById($wallId, $email);
    if ($wall === null)
      bailWithError('not-found');

    // Update fields
    if (!is_array($data))
      bailWithError('bad-request');
    foreach ($data as $key => $value) {
      $wall->$key = $value;
    }

    // Store result
    $result = $wall->save();
    break;

  default:
    bailWithError('bad-request');
}

// Return the result
print json_encode($result);
?>
