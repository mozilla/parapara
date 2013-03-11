<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../lib/parapara.inc');
require_once('simpletest/autorun.php');
require_once('WallMakerTestCase.php');

class SessionsTestCase extends WallMakerTestCase {

  protected $dateRegEx = '/2\d{3}-[01]\d-[0-3]\d [0-2]\d:[0-5]\d:[0-5]\d/';

  function __construct($name = false) {
    parent::__construct($name);
  }

  function testCreateWall() {
    // Login
    $this->login();

    // Create wall
    $wallId = $this->createWall('Test wall', $this->testDesignId);

    // Check wall is running
    $wall = $this->getWall($wallId);
    $this->assertTrue($wall['status'] == 'running');

    // Check there is a session ID, start time and null end time
    $this->assertTrue(array_key_exists('session', $wall) &&
                      $wall['session'], "No session information found");
    if (@$wall['session']) {
      $this->assertTrue($this->isOpenSession($wall['session']),
                        "After creating a wall we should have an open session");
    }

    // Tidy up by removing the wall
    $this->removeWall($wallId);
  }

  function testEndSession() {
    // Login
    $this->login();

    // Create wall
    $wallId = $this->createWall('Test wall', $this->testDesignId);

    // Close session
    $response = $this->closeSession($wallId);

    // Check we got the times and status
    $this->assertTrue(!array_key_exists('error_key', $response),
                      "Failed to close session:" . @$response['error_key']);
    $this->assertTrue($this->isClosedSession($response),
                      "Session does not appear to be closed.");

    // Re-fetch wall
    $wall = $this->getWall($wallId);
    $this->assertTrue($wall['status'] == 'finished');
    $this->assertTrue($this->isClosedSession($wall['session']),
                      "Refetched wall session does not appear to be closed.");

    // Logout and check it fails
    $this->logout();
    $response = $this->closeSession($wallId);
    $this->assertTrue(array_key_exists('error_key', $response) &&
                      $response['error_key'] == 'logged-out',
                      "Closed session whilst logged out.");

    // XXX Check we can't close the session of someone else's wall

    // Tidy up by removing the wall
    $this->removeWall($wallId);
  }

  function testStartNew() {
    // Login
    $this->login();

    // Create wall
    $wallId = $this->createWall('Test wall', $this->testDesignId);

    // Close session
    $response = $this->startNewSession($wallId);

    // Check we got the times and status
    $this->assertTrue(!array_key_exists('error_key', $response),
                      "Failed to start new session:" . @$response['error_key']);
    $this->assertTrue($this->isOpenSession($response),
                      "Session does not appear to be open");

    // Re-fetch wall
    $wall = $this->getWall($wallId);
    $this->assertTrue($wall['status'] == 'running');
    $this->assertTrue($this->isOpenSession($wall['session']),
                      "Refetched wall session does not appear to be open");

    // Logout and check it fails
    $this->logout();
    $response = $this->startNewSession($wallId);
    $this->assertTrue(array_key_exists('error_key', $response) &&
                      $response['error_key'] == 'logged-out',
                      "Started new session whilst logged out.");

    // XXX Check we can't start a new session on someone else's wall

    // Tidy up by removing the wall
    $this->removeWall($wallId);
  }

  function isOpenSession($session) {
    return $this->checkSession($session, true);
  }

  function isClosedSession($session) {
    return $this->checkSession($session, false);
  }

  function checkSession($session, $shouldBeOpen) {
    $this->assertTrue($session !== null, "Bad session");
    if (!$session)
      return false;
       
    // Check session end
    $this->assertTrue(intval(@$session['id']) > 0, "Bad session id");

    // Check session start
    $this->assertTrue(preg_match($this->dateRegEx, @$session['start']),
                      "Unexpected session start: " . @$session['start']);
      
    // Check session end
    $this->assertTrue(array_key_exists('end', $session) &&
                      ($session['end'] === null ||
                       preg_match($this->dateRegEx, @$session['end'])),
                      "Unexpected session end: " . @$session['end']);

    return $shouldBeOpen xor $session['end'] !== null;
  }


  function getWall($wallId) {
    // Set cookie
    if ($this->sessionId) {
      $this->setCookie(WALLMAKER_SESSION_NAME, session_id());
    }

    // Make request
    global $config;
    $url = $config['test']['wall_server'] . 'api/walls/' . $wallId;
    $response = $this->get($url);

    // Check response
    $this->assertResponse(200);
    $this->assertMime('text/plain; charset=UTF-8');

    // Parse response
    $wall = json_decode($response,true);
    $this->assertTrue($wall !== null,
                      "Failed to decode response: $response");

    // Check there's no error
    $this->assertTrue(!array_key_exists('error_key', $wall),
                      "Failed to get wall:" . @$wall['error_key']);

    return $wall;
  }

  function createWall($title, $designId) {
    // XXX We will define this globally once this API is tidied up

    // Set cookie
    if ($this->sessionId) {
      $this->setCookie(WALLMAKER_SESSION_NAME, session_id());
    }

    // Prepare payload
    $payload['title'] = $title;
    $payload['design'] = $designId;

    // Make request
    global $config;
    $url = $config['test']['wall_server'] . 'wall-maker/api/createWall';
    $response = $this->post($url, json_encode($payload));

    // Check response
    $this->assertResponse(200);
    $this->assertMime('text/plain; charset=UTF-8');

    // Parse response
    $wall = json_decode($response,true);
    $this->assertTrue($wall !== null,
                      "Failed to decode response: $response");

    // Check there's no error
    $this->assertTrue(!array_key_exists('error_key', $wall),
                      "Failed to get wall:" . @$wall['error_key']);

    return $wall['wallId'];
  }

  function closeSession($wallId) {
    // Set cookie
    if ($this->sessionId) {
      $this->setCookie(WALLMAKER_SESSION_NAME, session_id());
    }

    // Prepare payload
    $payload['wallId'] = $wallId;

    // Make request
    global $config;
    $url = $config['test']['wall_server'] . 'wall-maker/api/closeSession';
    $response = $this->post($url, json_encode($payload));

    // Check response
    $this->assertResponse(200);
    $this->assertMime('text/plain; charset=UTF-8');

    // Parse response
    $parsedResponse = json_decode($response,true);
    $this->assertTrue($parsedResponse !== null,
                      "Failed to decode response: $response");

    return $parsedResponse;
  }

  function startNewSession($wallId) {
    // Set cookie
    if ($this->sessionId) {
      $this->setCookie(WALLMAKER_SESSION_NAME, session_id());
    }

    // Prepare payload
    $payload['wallId'] = $wallId;

    // Make request
    global $config;
    $url = $config['test']['wall_server'] . 'wall-maker/api/startSession';
    $response = $this->post($url, json_encode($payload));

    // Check response
    $this->assertResponse(200);
    $this->assertMime('text/plain; charset=UTF-8');

    // Parse response
    $parsedResponse = json_decode($response,true);
    $this->assertTrue($parsedResponse !== null,
                      "Failed to decode response: $response");

    return $parsedResponse;
  }
}

?>
