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

  // Test creating works (get ID)
  // Test PUT method doesn't work?
  // Test name
  //   -- no name is error
  //   -- whitespace
  // Test designId
  // Test session exists
  // Test wall name is set
  // (I think it should basically return the same as fetching the wall??)
}

?>
