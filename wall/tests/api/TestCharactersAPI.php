<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once(dirname(__FILE__) . '/../../lib/parapara.inc');
require_once(dirname(__FILE__) . '/APITestCase.php');
require_once('simpletest/autorun.php');

class TestCharactersAPI extends APITestCase {
  function __construct($name = false) {
    parent::__construct($name);
  }

  function setUp() {
    parent::setUp();
  }

  function testCreateCharacter() {
    $this->api->login();
    $wall = $this->api->createWall('Test wall', $this->testDesignId);

    // Don't need to be logged-in in order to create a character
    $this->api->logout();
    $char = $this->api->createCharacter($wall['wallId']);
    $this->assertTrue(@$char['charId'] > 0, "Failed to create character");

    // Try fetching the character
    $contents = file_get_contents($char['rawUrl']);
    $this->assertTrue($contents !== FALSE, "Failed to load character from URL: "
                      . $char['rawUrl']);
    if ($contents) {
      $this->assertTrue(strpos($contents, "<svg") !== FALSE,
         "Saved SVG doesn't look like SVG: $contents");
    }
  }
}
?>
