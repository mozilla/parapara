<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../lib/parapara.inc');
require_once('simpletest/autorun.php');
require_once('WallMakerTestCase.php');

class GetWallTestCase extends WallMakerTestCase {

  function __construct($name = false) {
    parent::__construct($name);
  }

  function testLoggedOut() {
    // Create wall
    $this->login();
    $wall = $this->_createWall('Test wall', $this->testDesignId);
    $wallId = $wall['wallId'];
    $this->logout();

    // Check it fails if we're logged out
    $wall = $this->getWall($wallId);
    $this->assertTrue(array_key_exists('error_key', $wall) &&
                      $wall['error_key'] == 'logged-out',
                      "Got wall whilst logged out.");

    // Tidy up by removing the wall
    // XXX Probably need to be logged in to do this once we switch to using the 
    // API
    $this->removeWall($wallId);
  }

  function testGetWall() {
    // Create wall
    $this->login();
    $wall = $this->_createWall('Test wall', $this->testDesignId);
    $wallId = $wall['wallId'];

    // Check it succeeds
    $wall = $this->getWall($wallId);
    $this->assertTrue(!array_key_exists('error_key', $wall),
                      "Failed to get wall even though logged in.");

    // Check name
    $this->assertTrue(@$wall['name'] === 'Test wall',
                      "Unexpected wall name: " . @$wall['name']);

    // Check URL
    $wallUrl = @$wall['wallUrl'];
    $this->assertTrue($wallUrl, "No wall URL");
    $this->assertTrue(!$wallUrl || $this->looksLikeAUrl($wallUrl),
                      "Unexpected wall URL format: " . $wallUrl);

    // Check short URL
    $wallUrlShort = @$wall['wallUrlShort'];
    $this->assertTrue(!$wallUrlShort || $this->looksLikeAUrl($wallUrlShort),
                      "Unexpected shortened wall URL format: " . $wallUrlShort);

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

    // Tidy up by removing the wall
    $this->removeWall($wallId);
  }

  // XXX Check we can't get the information of someone else's wall

  function looksLikeAUrl($url) {
    $parts = parse_url($url);
    return @$parts['scheme'] == 'http' ||
           @$parts['scheme'] == 'https';
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

    return $wall;
  }
}

?>
