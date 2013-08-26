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

  function testGetCharactersBySession() {
    // Make wall
    $this->api->login();
    $wall = $this->api->createWall('Test wall', $this->testDesignId);

    // Create one character in the first session
    $this->api->createCharacter($wall['wallId']);

    // Create a couple of characters in a new session
    $newSession = 
      $this->api->startSession($wall['wallId'],
        $wall['latestSession']['sessionId']);
    $charA = $this->api->createCharacter($wall['wallId'],
      array('title' => 'Character A'));
    $charB = $this->api->createCharacter($wall['wallId'],
      array('title' => 'Character B'));
    $this->api->logout();

    // Fetch
    $result =
      $this->api->getCharactersBySession($wall['wallId'],
                                         $newSession['sessionId']);

    // Check result
    $this->assertNotNull($result);
    $this->assertEqual(count($result), 2);
    $this->assertIdentical($charA, $result[0]);
    $this->assertIdentical($charB, $result[1]);
  }

  function testGetCharactersByWall() {
    // Make wall
    $this->api->login();
    $wall = $this->api->createWall('Test wall', $this->testDesignId);

    // Create the following structure:
    // 
    //   - Session 1
    //     - Character A
    //     - Character B
    //   - Session 2
    //   - Session 3
    //     - Character C
    $session1 = $wall['latestSession'];
    $charA = $this->api->createCharacter($wall['wallId'],
      array('title' => 'Character A'));
    $charB = $this->api->createCharacter($wall['wallId'],
      array('title' => 'Character B'));
    $session2 = 
      $this->api->startSession($wall['wallId'], $session1['sessionId']);
    $session3 = 
      $this->api->startSession($wall['wallId'], $session2['sessionId']);
    $charC = $this->api->createCharacter($wall['wallId'],
      array('title' => 'Character C'));

    // Fetch
    $result = $this->api->getCharactersByWall($wall['wallId']);

    // Check result
    $this->assertNotNull($result);
    $this->assertEqual(count($result), 3);
    $this->assertEqual(count($result[0]['characters']), 2);
    $this->assertIdentical($charA, $result[0]['characters'][0]);
    $this->assertIdentical($charB, $result[0]['characters'][1]);
    $this->assertEqual(count($result[1]['characters']), 0);
    $this->assertEqual(count($result[2]['characters']), 1);
    $this->assertIdentical($charC, $result[2]['characters'][0]);
  }

  function testUpdateCharacter() {
    // Create wall
    $this->api->login();
    $wall = $this->api->createWall('Test wall', $this->testDesignId);

    // Create character
    $char = $this->api->createCharacter($wall['wallId']);

    // Set read-only
    $result =
      $this->api->updateCharacter($char['charId'], array('charId' => 25));
    $this->assertEqual(@$result['error_key'], 'readonly-field');

    // Set bad ID
    $result =
      $this->api->updateCharacter($char['charId']+1, array('active' => FALSE));
    $this->assertEqual(@$result['error_key'], 'character-not-found');

    // Set nothing
    $result = $this->api->updateCharacter($char['charId'], array());
    $this->assertSame(count($result), 0);

    // Test authorisation
    $this->api->logout();
    $result =
      $this->api->updateCharacter($char['charId'], array('active' => FALSE));
    $this->assertEqual(@$result['error_key'], 'logged-out');

    // No authorisation
    $this->api->login('abc@abc.org');
    $result =
      $this->api->updateCharacter($char['charId'], array('active' => FALSE));
    $this->assertEqual(@$result['error_key'], 'no-auth');
    $this->api->logout();
  }

  function testHideCharacter() {
    // Create wall
    $this->api->login();
    $wall = $this->api->createWall('Test wall', $this->testDesignId);

    // Create character
    $char = $this->api->createCharacter($wall['wallId']);

    // Check active state
    $this->assertTrue(@$char['active'], "Character not active initially");

    // Update active state
    $result =
      $this->api->updateCharacter($char['charId'], array('active' => FALSE));
    $this->assertFalse(@$result['active']);

    // Set same
    $result =
      $this->api->updateCharacter($char['charId'], array('active' => FALSE));
    $this->assertSame(count($result), 0);
  }
}
?>
