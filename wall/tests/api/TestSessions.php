<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../lib/parapara.inc');
require_once('simpletest/autorun.php');
require_once('APITestCase.php');

class SessionsTestCase extends APITestCase {

  protected $dateRegEx = '/2\d{3}-[01]\d-[0-3]\d [0-2]\d:[0-5]\d:[0-5]\d/';

  function __construct($name = false) {
    parent::__construct($name);
  }

  function setUp() {
    parent::setUp();
    $this->api->login();
  }

  function testCreateWall() {
    // Create wall
    $wall = $this->api->createWall('Test wall', $this->testDesignId);
    $this->assertEqual(@$wall['status'], 'running');

    // Check there is a session ID, start time and null end time
    $this->assertTrue(!empty($wall['latestSession']),
                      "No session information found");
    if (@$wall['latestSession']) {
      $this->assertTrue($this->isOpenSession($wall['latestSession']),
                        "After creating a wall we should have an open session");
    }
  }

  function testEndSession() {
    // Create wall
    $wall = $this->api->createWall('Test wall', $this->testDesignId);

    // Get current session ID
    $sessionId = $wall['latestSession']['id'];

    // End session
    $response = $this->api->endSession($wall['wallId'], $sessionId);

    // Check we got the times and status
    $this->assertTrue(!array_key_exists('error_key', $response),
                      "Failed to end session: " . @$response['error_key']);
    $this->assertTrue($this->isClosedSession($response),
                      "Session does not appear to be ended.");

    // Check the ID is the same
    $this->assertEqual(@$response['id'], $sessionId,
                       "Got different session IDs: %s");

    // Re-fetch wall
    $wall = $this->api->getWall($wall['wallId']);
    $this->assertTrue($wall['status'] == 'finished');
    $this->assertTrue($this->isClosedSession($wall['latestSession']),
                      "Refetched wall session does not appear to be ended.");

    // Logout and check it fails
    $this->api->logout();
    $response = $this->api->endSession($wall['wallId'], $sessionId);
    $this->assertTrue(@$response['error_key'] == 'logged-out',
                      "Closed session whilst logged out.");
  }

  function testEndClosedSession() {
    // Create wall
    $wall = $this->api->createWall('Test wall', $this->testDesignId);
    $sessionId = $wall['latestSession']['id'];

    // End session
    $response = $this->api->endSession($wall['wallId'], $sessionId);
    $this->assertTrue($this->isClosedSession($response),
                      "Session does not appear to be ended");

    // End again
    $response = $this->api->endSession($wall['wallId'], $sessionId);
    $this->assertTrue(array_key_exists('error_key', $response) &&
                      $response['error_key'] == 'parallel-change',
                      "No error about parallel change when closing twice");
    $this->assertTrue($this->isClosedSession(@$response['error_detail']),
                      "Doubly-ended session does not appear to be ended");

    // Check ID hasn't changed
    $this->assertEqual(@$response['error_detail']['id'], $sessionId,
                       "Got different session IDs: %s");

    // Re-fetch wall (to check we're in a consistent state)
    $wall = $this->api->getWall($wall['wallId']);
    $this->assertTrue($wall['status'] == 'finished');
    $this->assertTrue($this->isClosedSession($wall['latestSession']),
                      "Refetched wall session does not appear to be ended.");
  }

  function testEndSomeoneElsesWall() {
    // Create using test user
    $wall = $this->api->createWall('Test wall', $this->testDesignId);
    $sessionId = $wall['latestSession']['id'];

    // Switch user
    $this->api->login('abc@abc.org');
    $response = $this->api->endSession($wall['wallId'], $sessionId);
    $this->assertEqual(@$response['error_key'], 'no-auth');
  }

  function testStartNew() {
    // Create wall
    $wall = $this->api->createWall('Test wall', $this->testDesignId);
    $sessionId = $wall['latestSession']['id'];

    // Start new session
    $response = $this->api->startSession($wall['wallId'], $sessionId);

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
    $wall = $this->api->getWall($wall['wallId']);
    $this->assertTrue($wall['status'] == 'running');
    $this->assertTrue($this->isOpenSession($wall['latestSession']),
                      "Refetched wall session does not appear to be open");

    // Logout and check it fails
    $this->api->logout();
    $response = $this->api->startSession($wall['wallId'], $sessionId);
    $this->assertTrue(array_key_exists('error_key', $response) &&
                      $response['error_key'] == 'logged-out',
                      "Started new session whilst logged out.");
  }

  function testBadRequest() {
    $wall = $this->api->createWall('Test wall', $this->testDesignId);
    $sessionId = $wall['latestSession']['id'];
    $response = $this->api->startSession($wall['wallId'], null);
    $this->assertEqual(@$response['error_key'], 'bad-request');
  }

  function testParallelStartNew() {
    // Create wall
    $wall = $this->api->createWall('Test wall', $this->testDesignId);
    $sessionId = $wall['latestSession']['id'];

    // Start new session
    $responseA = $this->api->startSession($wall['wallId'], $sessionId);

    // And do it again but with the OLD sessionId
    $responseB = $this->api->startSession($wall['wallId'], $sessionId);
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
  }

  function testStartSomeoneElsesWall() {
    // Create wall as test user
    $wall = $this->api->createWall('Test wall', $this->testDesignId);
    $sessionId = $wall['latestSession']['id'];

    // Switch user
    $this->api->login('abc@abc.org');
    $response = $this->api->startSession($wall['wallId'], $sessionId);
    $this->assertEqual(@$response['error_key'], 'no-auth');
  }

  // Session IDs should be wall-specific
  function testSessionIds() {
    // Create first wall
    $wallA = $this->api->createWall('Wall 1', $this->testDesignId);
    $idA = $wallA['latestSession']['id'];

    // Create second wall
    $wallB = $this->api->createWall('Wall 2', $this->testDesignId);
    $idB = $wallB['latestSession']['id'];

    // Check IDs
    $this->assertEqual($idA, 1);
    $this->assertEqual($idB, 1);
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
}

?>
