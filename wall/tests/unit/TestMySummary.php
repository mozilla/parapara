<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../lib/parapara.inc');
require_once('simpletest/autorun.php');
require_once('WallMakerTestCase.php');
require_once('walls.inc');

class TestMySummary extends WallMakerTestCase {

  function __construct() {
    parent::__construct();
  }

  function testNotLoggedIn() {
    // When logged out we should get an error
    $summary = $this->getMySummary();
    $this->assertTrue(array_key_exists('error_key', $summary) &&
                      $summary['error_key'] == 'logged-out',
                      "Got summary whilst logged out.");
  }

  function testLoggingInAndOut() {
    // Check logging in works
    $this->login();
    $summary = $this->getMySummary();
    $this->assertTrue(!array_key_exists('error_key', $summary),
                      "Failed to get summary when logged in");

    // Check a subsequent logout
    $this->logout();
    $summary = $this->getMySummary();
    $this->assertTrue(array_key_exists('error_key', $summary) &&
                      $summary['error_key'] == 'logged-out',
                      "Got summary after logging out.");
  }

  function testWalls() {
    // Initially walls should be an empty array
    $this->login();
    $summary = $this->getMySummary();
    $this->assertTrue(array_key_exists('walls', $summary) &&
                      is_array($summary['walls']) &&
                      count($summary['walls']) === 0,
                      "Should have got an empty list of walls");

    $wallId = $this->createWall(
      array('ownerEmail' => $this->userEmail,
            'design' => $this->testDesignId,
            'title' => 'Test wall')
    );
    $summary = $this->getMySummary();
    $this->assertTrue(count($summary['walls']) === 1,
                      "Should have got one wall back");

    // Check contents of wall
    $wall = $summary['walls'][0];
    $this->assertTrue($wall['wallId'] === $wallId,
                      "Unexpected wall id: " . $wall['wallId']);
    $this->assertTrue($wall['eventName'] === "Test wall",
                      "Unexpected event name: " . $wall['eventName']);
    $this->assertTrue($wall['thumbnail'] === "/designs/test/preview/test.jpg",
                      "Unexpected thumbnail: " . $wall['thumbnail']);
    $this->assertTrue($wall['galleryDisplay'] === true,
                      "Unexpected gallery display: " . $wall['galleryDisplay']);
    /* Check the dates are set and are in the right format
        'createDate' => $row['createdate'],
        'modifyDate' => $row['modifydate']
     */

    // Tidy up by removing the wall
    $this->removeWall($wallId);
  }

  function testDesigns() {
    // Add a design
    // Check its details
  }

  function getMySummary() {
    // Set cookie
    if ($this->sessionId) {
      $this->setCookie(WALLMAKER_SESSION_NAME, session_id());
    }

    // Make request
    global $config;
    $url = $config['test']['wall_server'] . 'wall-maker/mysummary';
    $response = $this->get($url);

    // Check response
    $this->assertResponse(200);
    $this->assertMime('text/plain; charset=UTF-8');

    // Parse response
    $summary = json_decode($response,true);
    $this->assertTrue($summary !== null,
                      "Failed to decode response: $response");
    return $summary;
  }
}

?>
