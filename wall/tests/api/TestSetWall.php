<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../lib/parapara.inc');
require_once('simpletest/autorun.php');
require_once('WallMakerTestCase.php');

class SetWallTestCase extends WallMakerTestCase {

  function __construct($name = false) {
    parent::__construct($name);
  }

  function testSetName() {
    // Create wall
    $this->login();
    $wall = $this->createWall('ABC', $this->testDesignId);
    $wallId = $wall['wallId'];

    // Update title
    $result = $this->updateWall($wallId, array('name' => 'ABCD'));
    $this->assertTrue(!array_key_exists('error_key', $result),
                      "Failed to set wall name " . @$result['error_key']);
    $this->assertEqual(@$result['name'], 'ABCD');

    // Check it actually updated the wall
    $wall = $this->getWall($wallId);
    $this->assertEqual(@$wall['name'], 'ABCD');

    // Same title
    // Trimming
    // non-ASCII
    // Empty title
    // Whitespace only
    // Duplicate title

    // Tidy up
    $this->removeWall($wallId);
  }

  function testNotFound() {
  }

  function testSetSomeoneElsesWall() {
  }

  function testUnrecognizedParams() {
  }

  function testNoChange() {
  }
}
