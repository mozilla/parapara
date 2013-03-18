<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../lib/parapara.inc');
require_once('simpletest/autorun.php');
require_once('WallMakerTestCase.php');

class CreateWallTestCase extends WallMakerTestCase {

  function __construct($name = false) {
    parent::__construct($name);
  }

  function testLoggedOut() {
    // Check it fails if we're logged out
    $wall = $this->_createWall(
      'Test wall',
      $this->testDesignId
    );
    $this->assertTrue(@$wall['error_key'] == 'logged-out',
                      "Got wall whilst logged out.");
  }

  function testCreate() {
    $this->login();

    // Create wall
    $wall = $this->_createWall(
      'Test wall',
      $this->testDesignId
    );
    $this->assertTrue(!array_key_exists('error_key', $wall),
                      "Got error creating wall");
    $this->assertTrue(is_int(@$wall['wallId']) && $wall['wallId'] > 0,
                      "Unexpected wall ID: " . @$wall['wallId']);

    // Tidy up
    $this->removeWall($wall['wallId']);
  }

  function testName() {
    $this->login();

    // Create wall
    $wall = $this->_createWall(
      'Test wall',
      $this->testDesignId
    );

    // Test same name is returned
    $this->assertEqual(@$wall['name'], 'Test wall');

    // Tidy up
    $this->removeWall($wall['wallId']);

    // Test non-ASCII name
    // Test name is trimmed
    // Test empty name is rejected
    // Test whitespace-only name is rejected
    // Test duplicate name is rejected
  }

  function testUrl() {
    // Test simplification
    // Test when simplification produces duplicates
    // Test editor URL
    // Test short URLs
  }

  function testDesignId() {
    // Test it matches what we put in
  }
}

?>
