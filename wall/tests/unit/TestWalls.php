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
    $this->testWall->startSession();
    $session2 = $this->testWall->latestSession;

    // Session 3
    $this->testWall->startSession();
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
    $this->assertIdentical(@$walls[0], $wall2);

    // Remove both walls
    $wall2->destroy();
    $this->testWall->destroy();
    $walls = Walls::getAllForUser("test@test.org");
    $this->assertEqual(count($walls), 0);
  }

  function testDeleteSession() {
    // Check initial state
    $summary = $this->testWall->getSessions();
    $this->assertIdentical(count($summary), 1);
    $this->assertIdentical($this->testWall->status, "running");

    // Delete session
    $latestSessionId = $this->testWall->latestSession['sessionId'];
    $rv = $this->testWall->deleteSession($latestSessionId);
    $this->assertIdentical($rv, true);

    // Check state is updated
    $summary = $this->testWall->getSessions();
    $this->assertIdentical(count($summary), 0);
    $this->assertIdentical($this->testWall->status, "finished");
    $this->assertIdentical($this->testWall->latestSession, null);
  }

  function testDeleteSessionWithPreviousSession() {
    // Check initial state
    $this->testWall->startSession();
    $summary = $this->testWall->getSessions();
    $this->assertIdentical(count($summary), 2);
    $this->assertIdentical($this->testWall->status, "running");
    $this->assertIdentical($this->testWall->latestSession['sessionId'], 2);
    $this->assertIdentical($this->testWall->latestSession['end'], null);

    // Delete session
    $latestSessionId = $this->testWall->latestSession['sessionId'];
    $rv = $this->testWall->deleteSession($latestSessionId);
    $this->assertIdentical($rv, true);

    // Check state is updated
    $summary = $this->testWall->getSessions();
    $this->assertIdentical(count($summary), 1);
    $this->assertIdentical($this->testWall->status, "finished");
    $this->assertNotEqual($this->testWall->latestSession['sessionId'], null);
    $this->assertIdentical($this->testWall->latestSession['sessionId'], 1);
    $this->assertNotEqual($this->testWall->latestSession['end'], null);
  }

  function testDeleteSessionBadId() {
    // Check initial state
    $summary = $this->testWall->getSessions();
    $this->assertIdentical(count($summary), 1);

    // Try deleting session
    try {
      $this->testWall->deleteSession(
        $this->testWall->latestSession['sessionId'] + 1);
      $this->fail("Failed to throw exception with bad session ID");
    } catch (KeyedException $e) {
      $this->assertEqual($e->getKey(), "session-not-found");
      // Check nothing changed
      // XXX Check no characters were deleted
      $this->assertIdentical(count($summary), 1);
    }
  }

  function testDeleteNotLatestSession() {
    // Create extra session
    $firstSessionId = $this->testWall->latestSession['sessionId'];
    $this->testWall->startSession();

    // Delete session
    $rv = $this->testWall->deleteSession($firstSessionId);
    $this->assertIdentical($rv, true);

    // Check state is not updated
    $summary = $this->testWall->getSessions();
    $this->assertIdentical(count($summary), 1);
    $this->assertIdentical($this->testWall->status, "running");
    $this->assertNotEqual($this->testWall->latestSession, null);
  }

  function testDeleteSessionAndCharacters() {
    // Set up characters
    $session = $this->testWall->latestSession;
    $fields  = $this->testCharacterFields;
    $char    = $this->createCharacter($fields);

    // Check initial state
    $charFile = Character::getFileForId($char->charId);
    $this->assertTrue(file_exists($charFile), "No SVG at $charFile");

    // Delete
    $rv = $this->testWall->deleteSession($session['sessionId']);
    $this->assertIdentical($rv, true);

    // Check for characters
    $this->assertFalse(file_exists($charFile),
                       "SVG still remains at $charFile");
  }

  function testDeleteSessionButNotCharacters() {
    // Set up characters
    $session = $this->testWall->latestSession;
    $fields  = $this->testCharacterFields;
    $char    = $this->createCharacter($fields);

    // Check initial state
    $charFile = Character::getFileForId($char->charId);
    $this->assertTrue(file_exists($charFile), "No SVG at $charFile");

    // Delete record only
    $rv = $this->testWall->deleteSession($session['sessionId'],
                                         CharacterDeleteMode::DeleteRecordOnly);
    $this->assertIdentical($rv, true);

    // Check for characters
    $this->assertTrue(file_exists($charFile),
                       "SVG still remains at $charFile");

    // Tidy up
    @unlink($charFile);
  }

  function testFailedDelete() {
    // Set up characters
    $session = $this->testWall->latestSession;
    $fields  = $this->testCharacterFields;
    $char    = $this->createCharacter($fields);

    // Check initial state
    $charFile = Character::getFileForId($char->charId);
    $this->assertTrue(file_exists($charFile), "No SVG at $charFile");

    // Lock character file
    $fp = fopen($charFile, "rw+");
    flock($fp, LOCK_EX);

    // Delete
    try {
      $this->testWall->deleteSession($session['sessionId']);
      $this->fail("Failed to throw exception when deleting session with"
                  . " locked character file");
    } catch (KeyedException $e) {
      $this->assertEqual($e->getKey(), 'server-error',
        "Unexpected exception key when deleting locked file");
    }

    // Check status hasn't changed
    $summary = $this->testWall->getSessions();
    $this->assertIdentical(count($summary), 1);
    $this->assertIdentical($this->testWall->status, "running");

    // Unlock file so it can be cleaned up
    flock($fp, LOCK_UN);
    fclose($fp);
  }

  function testRestartSession() {
    // Check initial state
    $this->testWall->endSession();
    $this->assertIdentical($this->testWall->status, "finished");
    $this->assertNotEqual($this->testWall->latestSession['end'], null);
    $originalStart = $this->testWall->latestSession['start'];

    // Re-open session
    $rv = $this->testWall->restartSession();
    $this->assertIdentical($rv, true);
    $this->assertIdentical($this->testWall->status, "running");
    $this->assertIdentical($this->testWall->latestSession['end'], null);
    $this->assertIdentical($this->testWall->latestSession['start'],
                           $originalStart);
  }

  function testRestartNotLatestSession() {
    $this->testWall->startSession();
    $rv = $this->testWall->restartSession(1);
    $this->assertIdentical($rv, false);
  }

  function testRestartAlreadyOpenSession() {
    $rv = $this->testWall->restartSession(1);
    $this->assertIdentical($rv, false);
  }

  function testRestartBadSession() {
    $rv = $this->testWall->restartSession(2);
    $this->assertIdentical($rv, false);
  }

  function testDeleteWall() {
    // Delete wall
    $this->testWall->destroy();

    // Check it has gone
    $wall = Walls::getById($this->testWall->wallId);
    $this->assertIdentical($wall, null, "Failed to delete wall: %s");
  }

  function testDeleteWallAndCharacters() {
    // Create some characters
    $session1 = $this->testWall->latestSession;
    $fields = $this->testCharacterFields;
    $fields['title'] = 'Character A';
    $charA = $this->createCharacter($fields);

    // Session 2
    $this->testWall->startSession();
    $session2 = $this->testWall->latestSession;
    $fields['title'] = 'Character B';
    $charB = $this->createCharacter($fields);

    // Delete
    $this->testWall->destroy();

    // Check characters are gone
    $charFile = Character::getFileForId($charA->charId);
    $this->assertFalse(file_exists($charFile), "SVG still at $charFile");
    $charFile = Character::getFileForId($charB->charId);
    $this->assertFalse(file_exists($charFile), "SVG still at $charFile");
  }

  function testDeleteWallNotCharacters() {
    // Create some characters
    $session1 = $this->testWall->latestSession;
    $fields = $this->testCharacterFields;
    $fields['title'] = 'Character A';
    $charA = $this->createCharacter($fields);

    // Session 2
    $this->testWall->startSession();
    $session2 = $this->testWall->latestSession;
    $fields['title'] = 'Character B';
    $charB = $this->createCharacter($fields);

    // Delete
    $this->testWall->destroy(CharacterDeleteMode::DeleteRecordOnly);

    // Check characters are still there
    $charFile = Character::getFileForId($charA->charId);
    $this->assertTrue(file_exists($charFile), "No SVG at $charFile");
    @unlink($charFile);
    $charFile = Character::getFileForId($charB->charId);
    $this->assertTrue(file_exists($charFile), "No SVG at $charFile");
    @unlink($charFile);
  }
}

?>
