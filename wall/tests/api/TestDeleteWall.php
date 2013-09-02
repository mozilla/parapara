<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once(dirname(__FILE__) . '/../../lib/parapara.inc');
require_once(dirname(__FILE__) . '/APITestCase.php');
require_once('simpletest/autorun.php');

class DeleteWallTestCase extends APITestCase {

  function __construct($name = false) {
    parent::__construct($name);
  }

  function setUp() {
    parent::setUp();
    $this->api->login();
  }

  function testDelete() {
    // Create wall
    $wall = $this->api->createWall('Test wall', $this->testDesignId);

    // Delete wall
    $result = $this->api->removeWall($wall['wallId']);
    $this->assertTrue(!array_key_exists('error_key', $result),
      'Got error deleting wall: ' . @$result['error_key']
      . ' (' . @$result['error_detail'] . ')');
  }

  function testLoggedOut() {
    // Create wall
    $wall = $this->api->createWall('Test wall', $this->testDesignId);
    $this->api->logout();

    // Check it fails if we're logged out
    $result = $this->api->removeWall($wall['wallId']);
    $this->assertEqual(@$result['error_key'], 'logged-out',
                       "Deleted wall whilst logged out: %s");
  }

  function testDeleteByPath() {
    // Create wall
    $wall = $this->api->createWall('Test wall', $this->testDesignId);

    // Delete wall
    $result = $this->api->removeWall('test-wall');
    $this->assertTrue(!array_key_exists('error_key', $result),
      'Got error deleting wall: ' . @$result['error_key']
      . ' (' . @$result['error_detail'] . ')');
  }

  function testWrongUser() {
    // Create wall
    $wall = $this->api->createWall('Test wall', $this->testDesignId);
    $this->api->logout();

    // Login as someone else
    $this->api->login('abc@abc.org');
    $result = $this->api->removeWall($wall['wallId']);
    $this->assertEqual(@$result['error_key'], 'no-auth');
    $this->api->logout();
  }

  function testBadWallId() {
    $result = $this->api->removeWall(999999);
    $this->assertEqual(@$result['error_key'], 'wall-not-found');
  }

  function testKeepCharacters() {
    $wall = $this->api->createWall('Wall 1', $this->testDesignId);
    $char = $this->api->createCharacter($wall['wallId']);
    $result = $this->api->removeWall($wall['wallId'], "Keep character files");

    // Check character can still be read
    $this->assertNotEqual(@file_get_contents($char['rawUrl']), FALSE);

    // Clean up
    $this->api->removeCharacterFile($char['charId']);
  }

  function testRemoveCharacters() {
    $wall = $this->api->createWall('Wall 1', $this->testDesignId);
    $char = $this->api->createCharacter($wall['wallId']);
    $result = $this->api->removeWall($wall['wallId']);

    // Check character can't be read
    $this->assertIdentical(@file_get_contents($char['rawUrl']), FALSE);
  }
}

?>
