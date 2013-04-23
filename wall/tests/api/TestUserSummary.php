<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../lib/parapara.inc');
require_once('simpletest/autorun.php');
require_once('APITestCase.php');
require_once('walls.inc');

class TestMySummary extends APITestCase {

  function __construct() {
    parent::__construct();
  }

  function setUp() {
    parent::setUp();
    $this->api->login();
  }

  function testNotLoggedIn() {
    // When logged out we should get an error
    $this->api->logout();
    $summary = $this->api->getUserSummary();
    $this->assertTrue(array_key_exists('error_key', $summary) &&
                      $summary['error_key'] == 'logged-out',
                      "Got summary whilst logged out.");
  }

  function testLoggingInAndOut() {
    // Check logging in works
    $summary = $this->api->getUserSummary();
    $this->assertTrue(!array_key_exists('error_key', $summary),
                      "Failed to get summary when logged in");

    // Check a subsequent logout
    $this->api->logout();
    $summary = $this->api->getUserSummary();
    $this->assertTrue(array_key_exists('error_key', $summary) &&
                      $summary['error_key'] == 'logged-out',
                      "Got summary after logging out.");
  }

  function testWalls() {
    // Initially walls should be an empty array
    $summary = $this->api->getUserSummary();
    $this->assertTrue(array_key_exists('walls', $summary) &&
                      is_array($summary['walls']) &&
                      count($summary['walls']) === 0,
                      "Should have got an empty list of walls");

    $wall = $this->api->createWall('Test wall', $this->testDesignId);
    $wallId = $wall['wallId'];
    $summary = $this->api->getUserSummary();
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
    $dateRegEx = '/2\d{3}-[01]\d-[0-3]\d [0-2]\d:[0-5]\d:[0-5]\d/';
    $this->assertTrue(preg_match($dateRegEx, $wall['createDate']),
                      "Unexpected create date: " . $wall['createDate']);
    $this->assertTrue(preg_match($dateRegEx, $wall['modifyDate']),
                      "Unexpected modify date: " . $wall['modifyDate']);
  }

  function testDesigns() {
    // We should have at least one design initially since
    $summary = $this->api->getUserSummary();
    $this->assertTrue(array_key_exists('designs', $summary) &&
                      is_array($summary['designs']) &&
                      count($summary['designs']) >= 1,
                      "Should have at least one design");

    // Check the test design is there as expected
    $testDesign = null;
    foreach ($summary['designs'] as $design) {
      if ($design['name'] === 'test') {
        $testDesign = $design;
        break;
      }
    }
    $this->assertTrue($testDesign !== null, "Test design not found.");

    // Check it has the expected information
    $this->assertTrue(array_key_exists('designId', $testDesign) &&
                      is_int($testDesign['designId']),
                      "Design does not include designId or not numeric");
    $this->assertTrue(array_key_exists('duration', $testDesign) &&
                      is_int($testDesign['duration']),
                      "Design does not include duration or not numeric");
    $this->assertTrue(array_key_exists('thumbnail', $testDesign),
                      "Design does not include thumbnail");
  }
}

?>
