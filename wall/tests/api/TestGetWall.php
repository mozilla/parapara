<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once(dirname(__FILE__) . '/../../lib/parapara.inc');
require_once(dirname(__FILE__) . '/APITestCase.php');
require_once('simpletest/autorun.php');

class GetWallTestCase extends APITestCase {

  function __construct($name = false) {
    parent::__construct($name);
  }

  function setUp() {
    parent::setUp();
    $this->api->login();
  }

  function testLoggedOut() {
    // Create wall
    $wall = $this->api->createWall('Test wall', $this->testDesignId);
    $wallId = $wall['wallId'];
    $this->api->logout();

    // Check it fails if we're logged out
    $wall = $this->api->getWall($wallId);
    $this->assertEqual(@$wall['error_key'], 'logged-out',
                       "Got wall whilst logged out: %s");
  }

  function testGetWall() {
    // Create wall
    $wall = $this->api->createWall('Test wall', $this->testDesignId);
    $wallId = $wall['wallId'];

    // Check it succeeds
    $wall = $this->api->getWall($wallId);
    $this->assertTrue(!array_key_exists('error_key', $wall),
                      "Failed to get wall even though logged in");

    // Check name
    $this->assertTrue(@$wall['name'] === 'Test wall',
                      "Unexpected wall name: " . @$wall['name']);

    // Check URL
    $wallUrl = @$wall['wallUrl'];
    $this->assertTrue($wallUrl, "No wall URL");
    $this->assertTrue(!$wallUrl || $this->looksLikeAUrl($wallUrl),
                      "Unexpected wall URL format: " . $wallUrl);

    // Check editor URL
    $editorUrl = @$wall['editorUrl'];
    $this->assertTrue($editorUrl, "No editor URL");
    $this->assertTrue(!$editorUrl || $this->looksLikeAUrl($editorUrl),
                      "Unexpected editor URL format: " . $editorUrl);

    // Check editor short URL
    $editorUrlShort = @$wall['editorUrlShort'];
    $this->assertTrue(!$editorUrlShort || $this->looksLikeAUrl($editorUrlShort),
                      "Unexpected shortened editor URL format: "
                      . $editorUrlShort);

    // Check thumbnail
    $this->assertEqual(@substr($wall['thumbnail'], -strlen("test.jpg")),
                       "test.jpg");
  }

  function testGetWallByPath() {
    // Create wall
    $createdWall = $this->api->createWall('Test wall', $this->testDesignId);

    // Get wall
    $fetchedWall = $this->api->getWall('test-wall');
    $this->assertTrue(!array_key_exists('error_key', $fetchedWall),
                      "Failed to get wall using path");
    $this->assertIdentical(@$fetchedWall['wallId'], @$createdWall['wallId']);

    // Check session information is also loaded correctly
    $this->assertIdentical(@$fetchedWall['status'], @$createdWall['status']);
  }

  function testNotFound() {
    $wall = $this->api->getWall(5000);
    $this->assertEqual(@$wall['error_key'], 'not-found');
  }

  function testSomeoneElsesWall() {
    // Create wall
    $wall = $this->api->createWall('Test wall', $this->testDesignId);
    $wallId = $wall['wallId'];
    $this->api->logout();

    // Login as someone else
    $this->api->login('abc@abc.org');
    $wall = $this->api->getWall($wallId);
    $this->assertEqual(@$wall['error_key'], 'no-auth');
    $this->api->logout();
  }

  function looksLikeAUrl($url) {
    $parts = parse_url($url);
    return @$parts['scheme'] == 'http' ||
           @$parts['scheme'] == 'https';
  }
}

?>
