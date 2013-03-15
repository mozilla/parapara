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

  function testCloseSession() {
    // Login
    $this->login();

    // Create wall
    $wallId = $this->createWall('Test wall', $this->testDesignId);

    // Get current session ID
    $wall = $this->getWall($wallId);
    $sessionId = $wall['session']['id'];

    // Close session
    $response = $this->closeSession($wallId, $sessionId);

    // Check we got the times and status
    $this->assertTrue(!array_key_exists('error_key', $response),
                      "Failed to close session: " . @$response['error_key']);
    $this->assertTrue($this->isClosedSession($response),
                      "Session does not appear to be closed.");

    // Check the ID is the same
    $this->assertEqual(@$response['id'], $sessionId,
                       "Got different session IDs: %s");

    // Re-fetch wall
    $wall = $this->getWall($wallId);
    $this->assertTrue($wall['status'] == 'finished');
    $this->assertTrue($this->isClosedSession($wall['session']),
                      "Refetched wall session does not appear to be closed.");

    // Logout and check it fails
    $this->logout();
    $response = $this->closeSession($wallId, $sessionId);
    $this->assertTrue(array_key_exists('error_key', $response) &&
                      $response['error_key'] == 'logged-out',
                      "Closed session whilst logged out.");

    // XXX Check we can't close the session of someone else's wall
    // XXX Test we get a bad-request error if either wallId or sessionId is 
    // missing or bad

    // Tidy up by removing the wall
    $this->removeWall($wallId);
  }

  function testCloseClosedSession() {
    // Login
    $this->login();

    // Create wall
    $wallId = $this->createWall('Test wall', $this->testDesignId);
    $wall = $this->getWall($wallId); // In PHP < 5.4 we have to do this in two
                                     // steps
    $sessionId = $wall['session']['id'];

    // Close session
    $response = $this->closeSession($wallId, $sessionId);
    $this->assertTrue($this->isClosedSession($response),
                      "Session does not appear to be closed");

    // Close again
    $response = $this->closeSession($wallId, $sessionId);
    $this->assertTrue(array_key_exists('error_key', $response) &&
                      $response['error_key'] == 'parallel-change',
                      "No error about parallel change when closing twice");
    $this->assertTrue($this->isClosedSession(@$response['error_detail']),
                      "Doubly-closed session does not appear to be closed");

    // Check ID hasn't changed
    $this->assertEqual(@$response['error_detail']['id'], $sessionId,
                       "Got different session IDs: %s");

    // Re-fetch wall (to check we're in a consistent state)
    $wall = $this->getWall($wallId);
    $this->assertTrue($wall['status'] == 'finished');
    $this->assertTrue($this->isClosedSession($wall['session']),
                      "Refetched wall session does not appear to be closed.");

    // Tidy up by removing the wall
    $this->removeWall($wallId);
  }

  function testStartNew() {
    // Login
    $this->login();

    // Create wall
    $wallId = $this->createWall('Test wall', $this->testDesignId);
    $wall = $this->getWall($wallId);
    $sessionId = $wall['session']['id'];

    // Start new session
    $response = $this->startNewSession($wallId, $sessionId);

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
    $wall = $this->getWall($wallId);
    $this->assertTrue($wall['status'] == 'running');
    $this->assertTrue($this->isOpenSession($wall['session']),
                      "Refetched wall session does not appear to be open");

    // Logout and check it fails
    $this->logout();
    $response = $this->startNewSession($wallId, $sessionId);
    $this->assertTrue(array_key_exists('error_key', $response) &&
                      $response['error_key'] == 'logged-out',
                      "Started new session whilst logged out.");

    // XXX Check we can't start a new session on someone else's wall

    // Tidy up by removing the wall
    $this->removeWall($wallId);
  }

  function testParallelStartNew() {
    // Login
    $this->login();

    // Create wall
    $wallId = $this->createWall('Test wall', $this->testDesignId);
    $wall = $this->getWall($wallId);
    $sessionId = $wall['session']['id'];

    // Start new session
    $responseA = $this->startNewSession($wallId, $sessionId);

    // And do it again but with the OLD sessionId
    $responseB = $this->startNewSession($wallId, $sessionId);
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

    return $shouldBeOpen xor @$session['end'] !== null;
  }

  function getWall($wallId) {
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

  function closeSession($wallId, $sessionId) {
    // Prepare payload
    $payload['wallId'] = $wallId;
    $payload['sessionId'] = $sessionId;

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

  function startNewSession($wallId, $sessionId) {
    // Prepare payload
    $payload['wallId'] = $wallId;
    $payload['sessionId'] = $sessionId;

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
