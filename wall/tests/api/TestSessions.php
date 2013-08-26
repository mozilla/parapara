<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once(dirname(__FILE__) . '/../../lib/parapara.inc');
require_once(dirname(__FILE__) . '/APITestCase.php');
require_once('simpletest/autorun.php');

class SessionsTestCase extends APITestCase {

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
    $sessionId = $wall['latestSession']['sessionId'];

    // End session
    $response = $this->api->endSession($wall['wallId'], $sessionId);

    // Check we got the times and status
    $this->assertTrue(!array_key_exists('error_key', $response),
                      "Failed to end session: " . @$response['error_key']);
    $this->assertTrue($this->isClosedSession($response),
                      "Session does not appear to be ended.");

    // Check the ID is the same
    $this->assertEqual(@$response['sessionId'], $sessionId,
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
    $sessionId = $wall['latestSession']['sessionId'];

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
    $this->assertEqual(@$response['error_detail']['sessionId'], $sessionId,
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
    $sessionId = $wall['latestSession']['sessionId'];

    // Switch user
    $this->api->login('abc@abc.org');
    $response = $this->api->endSession($wall['wallId'], $sessionId);
    $this->assertEqual(@$response['error_key'], 'no-auth');
  }

  function testStartNew() {
    // Create wall
    $wall = $this->api->createWall('Test wall', $this->testDesignId);
    $latestSessionId = $wall['latestSession']['sessionId'];

    // Start new session
    $response = $this->api->startSession($wall['wallId'], $latestSessionId);

    // Check we got the times and status
    $this->assertTrue(!array_key_exists('error_key', $response),
                      "Failed to start new session: " .
                      @$response['error_key']);
    $this->assertTrue($this->isOpenSession($response),
                      "Session does not appear to be open");

    // Check the IDs differ
    $this->assertEqual(@$response['sessionId'], $latestSessionId+1,
                       "Got unexpected session ID: %s");

    // Check previous session is closed
    $sessions = $this->api->getSessions($wall['wallId']);
    $this->assertTrue($this->isClosedSession($sessions[0]),
                      "Previous session was not closed");

    // Re-fetch wall
    $wall = $this->api->getWall($wall['wallId']);
    $this->assertTrue($wall['status'] == 'running');
    $this->assertTrue($this->isOpenSession($wall['latestSession']),
                      "Refetched wall session does not appear to be open");

    // Logout and check it fails
    $this->api->logout();
    $response = $this->api->startSession($wall['wallId'], $latestSessionId);
    $this->assertTrue(array_key_exists('error_key', $response) &&
                      $response['error_key'] == 'logged-out',
                      "Started new session whilst logged out.");
  }

  function testStartNewNoLatestSession() {
    // Create wall
    $wall = $this->api->createWall('Test wall', $this->testDesignId);

    // Start new session
    $response = $this->api->startSession($wall['wallId']);

    // Check we got the times and status
    $this->assertTrue(!array_key_exists('error_key', $response),
                      "Failed to start new session: " .
                      @$response['error_key']);
  }

  function testParallelStartNew() {
    // Create wall
    $wall = $this->api->createWall('Test wall', $this->testDesignId);
    $latestSessionId = $wall['latestSession']['sessionId'];

    // Start new session
    $responseA = $this->api->startSession($wall['wallId'], $latestSessionId);

    // And do it again but with the OLD sessionId
    $responseB = $this->api->startSession($wall['wallId'], $latestSessionId);
    $this->assertTrue(array_key_exists('error_key', $responseB) &&
                      $responseB['error_key'] == 'parallel-change',
                      "No error about parallel change when starting with old "
                      . "session ID");
    $this->assertTrue($this->isOpenSession(@$responseB['error_detail']),
                      "Session returned after starting twice does not appear "
                      . " to be open");

    // Check the session returned by the parallel change matches that returned 
    // when we first started a new session
    $this->assertEqual(@$responseA['sessionId'],
                       @$responseB['error_detail']['sessionId'],
                       "Got unexpected session ID: %s");
  }

  function testRestartSession() {
    $wall = $this->api->createWall('Test wall', $this->testDesignId);
    $sessionId = $wall['latestSession']['sessionId'];

    // End and restart session
    $this->api->endSession($wall['wallId'], $sessionId);
    $response = $this->api->restartSession($wall['wallId'], $sessionId);

    // Check we got the times and status
    $this->assertTrue(!@array_key_exists('error_key', $response),
                      "Failed to end session: " . @$response['error_key']);
    $this->assertTrue($this->isOpenSession($response),
                      "Session does not appear to be open");

    // Double-check ID
    $this->assertEqual(@$response['sessionId'], $sessionId,
                       "Got different session IDs: %s");
  }

  function testRestartSessionWhileLoggedOut() {
    // Create wall and session
    $wall = $this->api->createWall('Test wall', $this->testDesignId);
    $sessionId = $wall['latestSession']['sessionId'];

    // Logout and check it fails
    $this->api->logout();
    $response = $this->api->restartSession(@$wall['wallId'], $sessionId);
    $this->assertTrue(@$response['error_key'] == 'logged-out',
                      "Closed session whilst logged out.");
  }

  function testRestartNotLatestSession() {
    $wall = $this->api->createWall('Test wall', $this->testDesignId);
    $sessionId = $wall['latestSession']['sessionId'];

    // Create a new session and restart old session
    $this->api->startSession($wall['wallId']);
    $response = $this->api->restartSession($wall['wallId'], $sessionId);

    // Check we got an error
    $this->assertTrue(array_key_exists('error_key', $response) &&
                      $response['error_key'] == 'parallel-change',
                      "No error about parallel change when restarting old"
                      . " session");
  }

  function testRestartAlreadyOpenSession() {
    $wall = $this->api->createWall('Test wall', $this->testDesignId);
    $sessionId = $wall['latestSession']['sessionId'];

    // Restart current session
    $response = $this->api->restartSession($wall['wallId'], $sessionId);

    // Check we got an error
    $this->assertTrue(array_key_exists('error_key', $response) &&
                      $response['error_key'] == 'parallel-change',
                      "No error about parallel change when restarting open"
                      . " session");
  }

  function testRestartBadSession() {
    $wall = $this->api->createWall('Test wall', $this->testDesignId);
    $sessionId = $wall['latestSession']['sessionId'];

    // Restart invalid session
    $response = $this->api->restartSession($wall['wallId'], $sessionId + 1);

    // Check we got an error
    $this->assertTrue(array_key_exists('error_key', $response) &&
                      $response['error_key'] == 'parallel-change',
                      "No error about parallel change when restarting invalid"
                      . " session");
  }

  function testStartSomeoneElsesWall() {
    // Create wall as test user
    $wall = $this->api->createWall('Test wall', $this->testDesignId);
    $latestSessionId = $wall['latestSession']['sessionId'];

    // Switch user
    $this->api->login('abc@abc.org');
    $response = $this->api->startSession($wall['wallId'], $latestSessionId);
    $this->assertEqual(@$response['error_key'], 'no-auth');
  }

  function testListSomeoneElsesWall() {
    // Create wall as test user
    $wall = $this->api->createWall('Wall 1', $this->testDesignId);

    // Switch user and try
    $this->api->login('abc@abc.org');
    $response = $this->api->getSessions($wall['wallId']);
    $this->assertEqual(@$response['error_key'], 'no-auth');
  }

  // Session IDs should be wall-specific
  function testSessionIds() {
    // Create first wall
    $wallA = $this->api->createWall('Wall 1', $this->testDesignId);
    $idA = $wallA['latestSession']['sessionId'];

    // Create second wall
    $wallB = $this->api->createWall('Wall 2', $this->testDesignId);
    $idB = $wallB['latestSession']['sessionId'];

    // Check IDs
    $this->assertEqual($idA, 1);
    $this->assertEqual($idB, 1);

    // Test next ID is 2
    $response = $this->api->startSession($wallA['wallId'], $idA);
    $this->assertEqual(@$response['sessionId'], 2);
  }

  function testInitialSessionList() {
    // Get initial list
    $wall = $this->api->createWall('Wall 1', $this->testDesignId);
    $sessions = $this->api->getSessions($wall['wallId']);
    $this->assertTrue(!array_key_exists('error_key', $sessions),
      'Got error getting designs: ' . @$sessions['error_key']
      . ' (' . @$sessions['error_detail'] . ')');

    // Should have one element
    $this->assertTrue(is_array($sessions) && count($sessions) === 1,
      'Unexpected initial list of sessions: ' . print_r($sessions, true));
    $this->assertEqual($sessions[0]['sessionId'], 1);
    $this->assertTrue($this->isOpenSession($sessions[0]),
                      "Session does not appear to be open");
  }

  function testDeleteSession() {
    $wall = $this->api->createWall('Wall 1', $this->testDesignId);
    $result = $this->api->deleteSession($wall['wallId'],
                                        $wall['latestSession']['sessionId']);
   
    // Should have no sessions
    $sessions = $this->api->getSessions($wall['wallId']);
    $this->assertTrue(is_array($sessions) && count($sessions) === 0,
      'Failed to delete session: ' . print_r($sessions, true));

    // Check updated latest session and status
    $this->assertIdentical(@$result['status'], "finished");
    $this->assertTrue(array_key_exists("latestSession", $result) &&
                      $result['latestSession'] === null,
                      "Updated latest session should be null");
  }

  function testDeleteSessionWithPreviousSession() {
    $wall = $this->api->createWall('Wall 1', $this->testDesignId);
    $response = $this->api->startSession($wall['wallId']);
    $this->assertTrue($response);
    $result = $this->api->deleteSession($wall['wallId'], 2);
   
    // Should have one session
    $sessions = $this->api->getSessions($wall['wallId']);
    $this->assertEqual(count($sessions), 1);

    // Check updated latest session and status
    $this->assertIdentical(@$result['status'], "finished");
    $this->assertTrue(array_key_exists("latestSession", $result) &&
                      $result['latestSession'] !== null,
                      "Updated latest session should not be null");
  }

  function testDeleteSessionBadId() {
    $wall = $this->api->createWall('Wall 1', $this->testDesignId);
    $result = $this->api->deleteSession($wall['wallId'],
                                        $wall['latestSession']['sessionId']+1);
    $this->assertEqual(@$result['error_key'], 'not-found');
  }

  function testDeleteNotLatestSession() {
    $wall = $this->api->createWall('Wall 1', $this->testDesignId);
    $response = $this->api->startSession($wall['wallId']);
    $this->assertTrue($response);
    $result = $this->api->deleteSession($wall['wallId'], 1);
   
    // Should have one session
    $sessions = $this->api->getSessions($wall['wallId']);
    $this->assertEqual(count($sessions), 1);

    // Check updated latest session and status
    $this->assertIdentical(@$result['status'], "running");
    $this->assertIdentical(@$result['latestSession']['sessionId'], 2);
  }

  function testDeleteSessionAndCharacters() {
    $wall = $this->api->createWall('Wall 1', $this->testDesignId);
    $char = $this->api->createCharacter($wall['wallId']);
    $result = $this->api->deleteSession($wall['wallId'],
                                        $wall['latestSession']['sessionId']);

    // Check character can't be read
    $this->assertIdentical(@file_get_contents($char['rawUrl']), FALSE);
  }

  function testDeleteSessionButNotCharacters() {
    $wall = $this->api->createWall('Wall 1', $this->testDesignId);
    $char = $this->api->createCharacter($wall['wallId']);
    $result = $this->api->deleteSession($wall['wallId'],
                                        $wall['latestSession']['sessionId'],
                                        "Keep character files");

    // Check character can be read
    $this->assertNotEqual(@file_get_contents($char['rawUrl']), FALSE);

    // Clean up
    $this->api->removeCharacterFile($char['charId']);
  }

  function testDeleteSessionNotLoggedIn() {
    $wall = $this->api->createWall('Wall 1', $this->testDesignId);
    $this->api->logout();
    $result = $this->api->deleteSession($wall['wallId'],
                                        $wall['latestSession']['sessionId']);
    $this->assertSame(@$result['error_key'],  'logged-out');
  }

  function testDeleteSessionNoAuth() {
    $wall = $this->api->createWall('Wall 1', $this->testDesignId);
    $this->api->login('abc@abc.org');
    $result = $this->api->deleteSession($wall['wallId'],
                                        $wall['latestSession']['sessionId']);
    $this->assertSame(@$result['error_key'],  'no-auth');
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
    $this->assertTrue(intval(@$session['sessionId']) > 0, "Bad session id");

    // Check session start
    $this->assertPattern($this->dateRegEx, @$session['start']);
      
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
