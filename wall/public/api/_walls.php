<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../lib/parapara.inc');
require_once('api.inc');
require_once('login.inc');
require_once('walls.inc');
require_once('utils.inc');

header('Content-Type: application/json; charset=UTF-8');

// Get login
$email = getUserEmail();

// Prepare common parameters
$wall = getRequestedWall();

// Parse input
$data = getRequestData();

switch ($_SERVER['REQUEST_METHOD']) {
  case 'POST':
    if (!$email)
      bailWithError('logged-out');

    // Create wall
    $name     = @$data['name'];
    $designId = @$data['design'];
    $wall     = Walls::create($name, $designId, $email);

    // Start session
    $currentdatetime = gmdate("Y-m-d H:i:s");
    $wall->startSession($currentdatetime, null);

    // Prepare result
    $result = $wall->asArray();
    break;

  case 'GET':
    switch ($wall) {
      case null:
        // Wall not found
        bailWithError('wall-not-found');

      case "Not specified":
        // Return all walls
        if (@!!$_REQUEST['showAll']) {
          $walls = Walls::getAllPublic();
        } else {
          if (!$email)
            bailWithError('logged-out');
          $walls = Walls::getAllForUser($email);
        }
        $flatten = create_function('$wall', 'return $wall->asArray();');
        $result = array_map($flatten, $walls);
        break;

      default:
        // Valid wall specified
        $result = $wall->asArray();

        // Currently we do a very rough job of filtering out information when 
        // not logged-in. In future we'll add fine-grained control so that walls
        // that are not intended for the public gallery listing only expose 
        // limited information here.
        if (!$wall->canAdminister()) {
          // Many of these won't exist, but just to be sure we clear them in 
          // case we slip up somewhere
          unset($result['latestSession']);
          unset($result['status']);
          unset($result['passcode']);
          unset($result['passcodeLen']);
          unset($result['ownerEmail']);
        }
        break;
    }
    break;

  case 'PUT':
  case 'PATCH':
    if (!$email)
      bailWithError('logged-out');
    if ($wall === "Not specified")
      bailWithError('bad-request');
    if ($wall === null)
      bailWithError('wall-not-found');

    // Update fields
    if (!is_array($data))
      bailWithError('bad-request');
    foreach ($data as $key => $value) {
      $wall->$key = $value;
    }

    // Store result
    $result = $wall->save();
    break;

  case 'DELETE':
    if (!$email)
      bailWithError('logged-out');
    if ($wall === "Not specified")
      bailWithError('bad-request');
    if ($wall === null)
      bailWithError('wall-not-found');

    $deleteMode = $data && @$data['keepCharacters']
                ? CharacterDeleteMode::DeleteRecordOnly
                : CharacterDeleteMode::DeleteAll;
    $wall->destroy($deleteMode);

    $result = array();
    break;

  default:
    bailWithError('bad-request');
}

// Return the result
print json_encode($result);
?>
