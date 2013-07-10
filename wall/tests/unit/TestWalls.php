<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once(dirname(__FILE__) . '/../../lib/parapara.inc');
require_once(dirname(__FILE__) . '/ParaparaUnitTestCase.php');
require_once('characters.inc');

class TestWalls extends ParaparaUnitTestCase {

  function __construct($name = false) {
    parent::__construct($name);
  }

  function setUp() {
    parent::setUp("Don't create test character");
  }

  function testGetSessionAndCharacters() {
    // Test structure
    //   - Session 1
    //     - Character A
    //     - Character B
    //   - Session 2
    //   - Session 3
    //     - Character C

    $fields = $this->testCharacterFields;

    // Session 1
    $session1 = $this->testWall->latestSession;
    $fields['title'] = 'Character A';
    $charA = $this->createCharacter($fields);
    $fields['title'] = 'Character B';
    $charB = $this->createCharacter($fields);

    // Session 2
    $this->testWall->startSession($session1['sessionId']);
    $session2 = $this->testWall->latestSession;

    // Session 3
    $this->testWall->startSession($session2['sessionId']);
    $session3 = $this->testWall->latestSession;
    $fields['title'] = 'Character C';
    $charC = $this->createCharacter($fields);

    // Get summary
    $summary = $this->testWall->getSessions("Include characters");

    // Test structure
    $this->assertEqual(count($summary), 3);

    // Test session 1
    $this->assertIdentical($summary[0]['sessionId'], $session1['sessionId']);
    $this->assertTrue(array_key_exists('characters', $summary[0]),
                      "No characters array along with session");
    $this->assertEqual(count(@$summary[0]['characters']), 2);
    $this->assertIdentical(@$summary[0]['characters'][0], $charA);
    $this->assertIdentical(@$summary[0]['characters'][1], $charB);

    // Test session 2
    $this->assertIdentical($summary[1]['sessionId'], $session2['sessionId']);
    $this->assertTrue(array_key_exists('characters', $summary[1]),
                      "No characters array along with session");
    $this->assertEqual(count(@$summary[1]['characters']), 0);

    // Test session 3
    $this->assertIdentical($summary[2]['sessionId'], $session3['sessionId']);
    $this->assertTrue(array_key_exists('characters', $summary[2]),
                      "No characters array along with session");
    $this->assertEqual(count(@$summary[2]['characters']), 1);
    $this->assertIdentical(@$summary[2]['characters'][0], $charC);
  }

  function testGetAll() {
    // Get walls--should have only the test wall so far
    $walls = Walls::getAllForUser("test@test.org");
    $this->assertEqual(count($walls), 1);
    $this->assertIdentical(@$walls[0], $this->testWall);

    // Create a second wall
    $wall2 = Walls::create("Second wall", $this->testWall->designId,
                           "test@test.org");
    $walls = Walls::getAllForUser("test@test.org");
    $this->assertEqual(count($walls), 2);
    $this->assertIdentical(@$walls[1], $wall2);

    // Remove both walls
    // XXX Replace this with a method call once we have it
    $this->api->removeWall($wall2->wallId);
    $this->api->removeWall($this->testWall->wallId);
    $walls = Walls::getAllForUser("test@test.org");
    $this->assertEqual(count($walls), 0);
  }
}

?>
