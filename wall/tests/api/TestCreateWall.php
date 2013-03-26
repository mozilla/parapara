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
    $wall = $this->createWall('Test wall', $this->testDesignId);
    $this->assertTrue(@$wall['error_key'] == 'logged-out',
                      "Got wall whilst logged out");
  }

  function testCreate() {
    $this->login();

    // Create wall
    $wall = $this->createWall('Test wall', $this->testDesignId);
    $this->assertTrue(!array_key_exists('error_key', $wall),
                      "Got error creating wall");
    $this->assertTrue(is_int(@$wall['wallId']) && $wall['wallId'] > 0,
                      "Unexpected wall ID: " . @$wall['wallId']);

    // Tidy up
    $this->removeWall($wall['wallId']);
  }

  function testName() {
    $this->login();

    // Test same name is returned
    $wall = $this->createWall('Test wall', $this->testDesignId);
    $this->assertEqual(@$wall['name'], 'Test wall');
    $this->removeWall($wall['wallId']);

    // Test non-ASCII name
    $wall = $this->createWall('素晴らしい壁', $this->testDesignId);
    $this->assertEqual(@$wall['name'], '素晴らしい壁');
    $this->removeWall($wall['wallId']);

    // Test name is trimmed
    $wall = $this->createWall(" \t　space\r\n ", $this->testDesignId);
    $this->assertEqual(@$wall['name'], 'space');
    $this->removeWall($wall['wallId']);

    // Test empty name is rejected
    $wall = $this->createWall("", $this->testDesignId);
    $this->assertTrue(@$wall['error_key'] == 'empty-name',
                      "Made wall with no name");

    // Test whitespace-only name is rejected
    $wall = $this->createWall(" \t\r\n　", $this->testDesignId);
    $this->assertTrue(@$wall['error_key'] == 'empty-name',
                      "Made wall with whitespace name");

    // Test duplicate name is rejected
    $wallA = $this->createWall('Test wall', $this->testDesignId);
    $wallB = $this->createWall('  Test wall ', $this->testDesignId);
    $this->assertTrue(@$wallB['error_key'] == 'duplicate-name',
                      "Made two walls with the same name");
    $this->removeWall($wallA['wallId']);
  }

  function testUrl() {
    $this->login();

    // Test simplification
    $wall = $this->createWall(' Test wall ', $this->testDesignId);
    $this->assertEqual($this->getWallPath(@$wall['wallUrl']), 'test-wall');
    $this->removeWall($wall['wallId']);

    // Test non-ASCII
    $wall = $this->createWall('Café', $this->testDesignId);
    $this->assertEqual($this->getWallPath(@$wall['wallUrl']), 'caf%C3%A9');
    $this->removeWall($wall['wallId']);

    // Test converting full-with numbers to half-width
    $wall = $this->createWall('１２３ＡＢＣ　', $this->testDesignId);
    $this->assertEqual($this->getWallPath(@$wall['wallUrl']), '123abc');
    $this->removeWall($wall['wallId']);

    // Test when simplification produces duplicates
    // -- we should generate a random wall path instead
    $wallA = $this->createWall('ＡＢＣ', $this->testDesignId);
    $wallB = $this->createWall('abc', $this->testDesignId);
    $this->assertNotEqual($this->getWallPath(@$wallB['wallUrl']), 'abc');
    $this->removeWall($wallA['wallId']);
    $this->removeWall($wallB['wallId']);

    // Test editor URL
    $wall = $this->createWall('Test wall', $this->testDesignId);
    $this->assertTrue(!empty($wall['editorUrl']), 'No editor URL found');
    $this->removeWall($wall['wallId']);
  }

  function testEmail() {
    $this->login();

    // Test the ownerEmail returned is set to the email we passed in
    $wall = $this->createWall('Test wall', $this->testDesignId);
    $this->assertEqual(@$wall['ownerEmail'], $this->userEmail);
    $this->removeWall($wall['wallId']);

    // Try a bad email
    $this->logout();
    $this->login('abc');
    $wall = $this->createWall('Test wall', $this->testDesignId);
    $this->assertEqual(@$wall['error_key'], 'bad-email');
  }

  function testDesignId() {
    $this->login();

    // Test design ID matches what we put in
    $wall = $this->createWall('Test wall', $this->testDesignId);
    $this->assertEqual(@$wall['designId'], $this->testDesignId);
    $this->removeWall($wall['wallId']);

    // Test a bad ID fails
    $wall = $this->createWall('Test wall', 5000);
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
