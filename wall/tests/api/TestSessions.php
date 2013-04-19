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
    $wall = $this->createWall('Test wall', $this->testDesignId);
    $this->assertEqual(@$wall['status'], 'running');

    // Check there is a session ID, start time and null end time
    $this->assertTrue(!empty($wall['latestSession']),
                      "No session information found");
    if (@$wall['latestSession']) {
      $this->assertTrue($this->isOpenSession($wall['latestSession']),
                        "After creating a wall we should have an open session");
    }

    // Tidy up by removing the wall
    $this->removeWall($wall['wallId']);
  }

  function testEndSession() {
    // Login
    $this->login();

    // Create wall
    $wall = $this->createWall('Test wall', $this->testDesignId);

    // Get current session ID
    $sessionId = $wall['latestSession']['id'];

    // End session
    $response = $this->endSession($wall['wallId'], $sessionId);

    // Check we got the times and status
    $this->assertTrue(!array_key_exists('error_key', $response),
                      "Failed to end session: " . @$response['error_key']);
    $this->assertTrue($this->isClosedSession($response),
                      "Session does not appear to be ended.");

    // Check the ID is the same
    $this->assertEqual(@$response['id'], $sessionId,
                       "Got different session IDs: %s");

    // Re-fetch wall
    $wall = $this->getWall($wall['wallId']);
    $this->assertTrue($wall['status'] == 'finished');
    $this->assertTrue($this->isClosedSession($wall['latestSession']),
                      "Refetched wall session does not appear to be ended.");

    // Logout and check it fails
    $this->logout();
    $response = $this->endSession($wall['wallId'], $sessionId);
    $this->assertTrue(@$response['error_key'] == 'logged-out',
                      "Closed session whilst logged out.");

    // Tidy up by removing the wall
    $this->removeWall($wall['wallId']);
  }

  function testEndClosedSession() {
    // Login
    $this->login();

    // Create wall
    $wall = $this->createWall('Test wall', $this->testDesignId);
    $sessionId = $wall['latestSession']['id'];

    // End session
    $response = $this->endSession($wall['wallId'], $sessionId);
    $this->assertTrue($this->isClosedSession($response),
                      "Session does not appear to be ended");

    // End again
    $response = $this->endSession($wall['wallId'], $sessionId);
    $this->assertTrue(array_key_exists('error_key', $response) &&
                      $response['error_key'] == 'parallel-change',
                      "No error about parallel change when closing twice");
    $this->assertTrue($this->isClosedSession(@$response['error_detail']),
                      "Doubly-ended session does not appear to be ended");

    // Check ID hasn't changed
    $this->assertEqual(@$response['error_detail']['id'], $sessionId,
                       "Got different session IDs: %s");

    // Re-fetch wall (to check we're in a consistent state)
    $wall = $this->getWall($wall['wallId']);
    $this->assertTrue($wall['status'] == 'finished');
    $this->assertTrue($this->isClosedSession($wall['latestSession']),
                      "Refetched wall session does not appear to be ended.");

    // Tidy up by removing the wall
    $this->removeWall($wall['wallId']);
  }

  function testEndSomeoneElsesWall() {
    // Login as test user
    $this->login();
    $wall = $this->createWall('Test wall', $this->testDesignId);
    $sessionId = $wall['latestSession']['id'];

    // Switch user
    $this->login('abc@abc.org');
    $response = $this->endSession($wall['wallId'], $sessionId);
    $this->assertEqual(@$response['error_key'], 'no-auth');

    // Tidy up by removing the wall
    $this->removeWall($wall['wallId']);
  }

  function testStartNew() {
    // Login
    $this->login();

    // Create wall
    $wall = $this->createWall('Test wall', $this->testDesignId);
    $sessionId = $wall['latestSession']['id'];

    // Start new session
    $response = $this->startSession($wall['wallId'], $sessionId);

    // Check we got the times and status
    $this->assertTrue(!array_key_exists('error_key', $response),
                      "Failed to start new session: " .
                      @$response['error_key']);
    $this->assertTrue($this->isOpenSession($response),
                      "Session does not appear to be open");

    // Check the IDs differ
    $this->assertEqual(@$response['id'], $sessionId+1,
                       "Got unexpected session ID: %s");

    // Re-fetch wall
    $wall = $this->getWall($wall['wallId']);
    $this->assertTrue($wall['status'] == 'running');
    $this->assertTrue($this->isOpenSession($wall['latestSession']),
                      "Refetched wall session does not appear to be open");

    // Logout and check it fails
    $this->logout();
    $response = $this->startSession($wall['wallId'], $sessionId);
    $this->assertTrue(array_key_exists('error_key', $response) &&
                      $response['error_key'] == 'logged-out',
                      "Started new session whilst logged out.");

    // Tidy up by removing the wall
    $this->removeWall($wall['wallId']);
  }

  function testBadRequest() {
    // Login
    $this->login();
    $wall = $this->createWall('Test wall', $this->testDesignId);
    $sessionId = $wall['latestSession']['id'];
    $response = $this->startSession($wall['wallId'], null);
    $this->assertEqual(@$response['error_key'], 'bad-request');

    // Tidy up by removing the wall
    $this->removeWall($wall['wallId']);
  }

  function testParallelStartNew() {
    // Login
    $this->login();

    // Create wall
    $wall = $this->createWall('Test wall', $this->testDesignId);
    $sessionId = $wall['latestSession']['id'];

    // Start new session
    $responseA = $this->startSession($wall['wallId'], $sessionId);

    // And do it again but with the OLD sessionId
    $responseB = $this->startSession($wall['wallId'], $sessionId);
    $this->assertTrue(array_key_exists('error_key', $responseB) &&
                      $responseB['error_key'] == 'parallel-change',
                      "No error about parallel change when starting with old "
                      . "session ID");
    $this->assertTrue($this->isOpenSession(@$responseB['error_detail']),
                      "Session returned after starting twice does not appear "
                      . " to be open");

    // Check the session returned by the parallel change matches that returned 
    // when we first started a new session
    $this->assertEqual(@$responseA['id'], @$responseB['error_detail']['id'],
                       "Got unexpected session ID: %s");

    // Tidy up by removing the wall
    $this->removeWall($wall['wallId']);
  }

  function testStartSomeoneElsesWall() {
    // Login as test user
    $this->login();
    $wall = $this->createWall('Test wall', $this->testDesignId);
    $sessionId = $wall['latestSession']['id'];

    // Switch user
    $this->login('abc@abc.org');
    $response = $this->startSession($wall['wallId'], $sessionId);
    $this->assertEqual(@$response['error_key'], 'no-auth');

    // Tidy up by removing the wall
    $this->removeWall($wall['wallId']);
  }

  function testSessionIds() {
    // Session IDs should be wall-specific
    $this->login();

    // Create first wall
    $wallA = $this->createWall('Wall 1', $this->testDesignId);
    $idA = $wallA['latestSession']['id'];

    // Create second wall
    $wallB = $this->createWall('Wall 2', $this->testDesignId);
    $idB = $wallB['latestSession']['id'];

    // Check IDs
    $this->assertEqual($idA, 1);
    $this->assertEqual($idB, 1);

    // Tidy up
    $this->removeWall($wallA['wallId']);
    $this->removeWall($wallB['wallId']);
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

    return $shouldBeOpen xor @$session['end'] !== null;
  }

  function getWall($wallId) {
    // Make request
    global $config;
    $url = $config['test']['wall_server'] . 'api/walls/' . $wallId;
    $response = $this->get($url);

    // Check response
    $this->assertResponse(200);
    $this->assertMime('application/json; charset=UTF-8');

    // Parse response
    $wall = json_decode($response,true);
    $this->assertTrue($wall !== null,
                      "Failed to decode response: $response");

    // Check there's no error
    $this->assertTrue(!array_key_exists('error_key', $wall),
                      "Failed to get wall:" . @$wall['error_key']);

    return $wall;
  }

  function startSession($wallId, $sessionId) {
    // Prepare payload
    $payload['sessionId'] = $sessionId;

    // Make request
    global $config;
    $url = $config['test']['wall_server'] . "api/walls/$wallId/sessions";
    $response = $this->post($url, json_encode($payload));

    // Check response
    $this->assertResponse(200);
    $this->assertMime('application/json; charset=UTF-8');

    // Parse response
    $parsedResponse = json_decode($response,true);
    $this->assertTrue($parsedResponse !== null,
                      "Failed to decode response: $response");

    return $parsedResponse;
  }

  function endSession($wallId, $sessionId) {
    // Make request
    global $config;
    $url = $config['test']['wall_server'] .
      "api/walls/$wallId/sessions/$sessionId";
    $response = $this->put($url, null);

    // Check response
    $this->assertResponse(200);
    $this->assertMime('application/json; charset=UTF-8');

    // Parse response
    $parsedResponse = json_decode($response,true);
    $this->assertTrue($parsedResponse !== null,
                      "Failed to decode response: $response");

    return $parsedResponse;
  }
}

?>
