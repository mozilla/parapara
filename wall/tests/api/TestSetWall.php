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

    // Try setting the same title--nothing should be returned since nothing 
    // changed
    $result = $this->updateWall($wallId, array('name' => 'ABCD'));
    $this->assertEqual(count($result), 0);

    // Trimming
    $result = $this->updateWall($wallId, array('name' => " \twall name\n　"));
    $this->assertEqual(@$result['name'], 'wall name');

    // Non-ASCII
    $result = $this->updateWall($wallId, array('name' => 'テスト'));
    $this->assertEqual(@$result['name'], 'テスト');

    // Empty title
    $result = $this->updateWall($wallId, array('name' => ""));
    $this->assertTrue(@$result['error_key'] == 'empty-name',
                      "Made wall name empty");

    // Whitespace only
    $result = $this->updateWall($wallId, array('name' => " \t\n　"));
    $this->assertTrue(@$result['error_key'] == 'empty-name',
                      "Made wall name whitespace only");

    // Duplicate title
    $wall2 = $this->createWall('Wall #2', $this->testDesignId);
    $wall2Id = $wall2['wallId'];
    $result = $this->updateWall($wallId, array('name' => "Wall #2"));
    $this->assertTrue(@$result['error_key'] == 'duplicate-name',
                      "Made duplicate wall name");
    $this->removeWall($wall2Id);

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

  function testSetMultiple() {
  }
}
