<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../lib/parapara.inc');
require_once('simpletest/autorun.php');
require_once('APITestCase.php');

class CreateWallTestCase extends APITestCase {

  function __construct($name = false) {
    parent::__construct($name);
  }

  function setUp() {
    parent::setUp();
    $this->api->login();
  }

  function testLoggedOut() {
    $this->api->logout();

    // Check it fails if we're logged out
    $wall = $this->api->createWall('Test wall', $this->testDesignId);
    $this->assertTrue(@$wall['error_key'] == 'logged-out',
                      "Got wall whilst logged out");
  }

  function testCreate() {
    // Create wall
    $wall = $this->api->createWall('Test wall', $this->testDesignId);
    $this->assertTrue(!array_key_exists('error_key', $wall),
                      "Got error creating wall");
    $this->assertTrue(is_int(@$wall['wallId']) && $wall['wallId'] > 0,
                      "Unexpected wall ID: " . @$wall['wallId']);
  }

  function testName() {
    // Test same name is returned
    $wall = $this->api->createWall('Test wall', $this->testDesignId);
    $this->assertEqual(@$wall['name'], 'Test wall');

    // Test non-ASCII name
    $wall = $this->api->createWall('素晴らしい壁', $this->testDesignId);
    $this->assertEqual(@$wall['name'], '素晴らしい壁');

    // Test name is trimmed
    $wall = $this->api->createWall(" \t　space\r\n ", $this->testDesignId);
    $this->assertEqual(@$wall['name'], 'space');

    // Test empty name is rejected
    $wall = $this->api->createWall("", $this->testDesignId);
    $this->assertTrue(@$wall['error_key'] == 'empty-name',
                      "Made wall with no name");

    // Test whitespace-only name is rejected
    $wall = $this->api->createWall(" \t\r\n　", $this->testDesignId);
    $this->assertTrue(@$wall['error_key'] == 'empty-name',
                      "Made wall with whitespace name");

    // Test duplicate name is rejected
    $wallA = $this->api->createWall('Test wall', $this->testDesignId);
    $wallB = $this->api->createWall('  Test wall ', $this->testDesignId);
    $this->assertTrue(@$wallB['error_key'] == 'duplicate-name',
                      "Made two walls with the same name");
  }

  function testUrl() {
    // Test simplification
    $wall = $this->api->createWall(' Test wall ', $this->testDesignId);
    $this->assertEqual($this->getWallPath(@$wall['wallUrl']), 'test-wall');

    // Test non-ASCII
    $wall = $this->api->createWall('Café', $this->testDesignId);
    $this->assertEqual($this->getWallPath(@$wall['wallUrl']), 'caf%C3%A9');

    // Test converting full-with numbers to half-width
    $wall = $this->api->createWall('１２３ＡＢＣ　', $this->testDesignId);
    $this->assertEqual($this->getWallPath(@$wall['wallUrl']), '123abc');

    // Test when simplification produces duplicates
    // -- we should generate a random wall path instead
    $wallA = $this->api->createWall('ＡＢＣ', $this->testDesignId);
    $wallB = $this->api->createWall('abc', $this->testDesignId);
    $this->assertNotEqual($this->getWallPath(@$wallB['wallUrl']), 'abc');

    // Test editor URL
    $wall = $this->api->createWall('Test wall 2', $this->testDesignId);
    $this->assertTrue(!empty($wall['editorUrl']), 'No editor URL found');
  }

  function testEmail() {
    // Test the ownerEmail returned is set to the email we passed in
    $wall = $this->api->createWall('Test wall 1', $this->testDesignId);
    $this->assertEqual(@$wall['ownerEmail'], $this->api->userEmail);

    // Try a bad email
    $this->api->logout();
    $this->api->login('abc');
    $wall = $this->api->createWall('Test wall 2', $this->testDesignId);
    $this->assertEqual(@$wall['error_key'], 'bad-email');
  }

  function testDesignId() {
    // Test design ID matches what we put in
    $wall = $this->api->createWall('Test wall 1', $this->testDesignId);
    $this->assertEqual(@$wall['designId'], $this->testDesignId);

    // Test a bad ID fails
    $wall = $this->api->createWall('Test wall 2', 5000);
    $this->assertEqual(@$wall['error_key'], 'design-not-found');
  }

  function getWallPath($wallUrl) {
    // Convert http://...../wall-path/ => wall-path
    if (!preg_match('/\/([^\/]*)$/', $wallUrl, $matches))
      return null;
    return $matches[1];
  }
}

?>
