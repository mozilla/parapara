<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once(dirname(__FILE__) . '/../../lib/parapara.inc');
require_once(dirname(__FILE__) . '/APITestCase.php');
require_once('simpletest/autorun.php');

class GetWallsTestCase extends APITestCase {

  function __construct($name = false) {
    parent::__construct($name);
  }

  function setUp() {
    parent::setUp();
    $this->api->login();
  }

  function testLoggedOut() {
    // When logged out we should get an error
    $this->api->logout();
    $walls = $this->api->getWalls();
    $this->assertTrue(array_key_exists('error_key', $walls) &&
                      $walls['error_key'] == 'logged-out',
                      "Got walls whilst logged out.");
  }

  function testGetWalls() {
    // No walls initially
    $walls = $this->api->getWalls();
    $this->assertNotNull($walls);
    $this->assertTrue(is_array($walls));
    $this->assertTrue(!array_key_exists('error_key', $walls));
    $this->assertEqual(count($walls), 0);

    // Create some walls
    $wallA = $this->api->createWall('Wall A', $this->testDesignId);
    $wallB = $this->api->createWall('Wall B', $this->testDesignId);

    // Fetch them
    $walls = $this->api->getWalls();
    $this->assertNotNull($walls);
    $this->assertTrue(is_array($walls));
    $this->assertTrue(!array_key_exists('error_key', $walls));
    $this->assertEqual(count($walls), 2);
    $this->assertIdentical($wallA, $walls[1]);
    $this->assertIdentical($wallB, $walls[0]);
  }
}

?>
