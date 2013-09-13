<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once(dirname(__FILE__) . '/../../lib/parapara.inc');
require_once(dirname(__FILE__) . '/ParaparaUnitTestCase.php');
require_once('characters.inc');

class TestCharacters extends ParaparaUnitTestCase {
  protected $testFields;
  protected $testSvg;

  function __construct($name = false) {
    parent::__construct($name);
    $this->testFields =& $this->testCharacterFields;
    $this->testSvg    =& $this->testCharacterSvg;
  }

  function setUp() {
    parent::setUp("Don't create test character");
  }

  function testCreateCharacter() {
    $char = $this->createCharacter();

    $this->assertIdLike(@$char->charId, "Bad character ID: %s");
    $this->assertIdLike(@$char->wallId, "Bad wall ID: %s");
    $this->assertIdLike(@$char->sessionId, "Bad session ID: %s");

    $this->assertIdentical(@$char->title, $this->testFields['title']);
    $this->assertIdentical(@$char->author, $this->testFields['author']);
    $this->assertIdentical(@$char->groundOffset,
                       $this->testFields['groundOffset']);
    $this->assertIdentical(@$char->width, $this->testFields['width']);
    $this->assertIdentical(@$char->height, $this->testFields['height']);
    $this->assertPattern($this->dateRegEx, @$char->createDate);
    $this->assertIdentical(@$char->active, TRUE);
    $this->assertWithinMargin(@$char->x,
      $this->testWall->getCurrentProgress(), 0.1);
  }

  function testWallNotFound() {
    try {
      $char = $this->createCharacter($this->testFields, 0);
      $this->fail("Failed to throw exception with bad Wall ID");
    } catch (KeyedException $e) {
      $this->assertEqual($e->getKey(), "wall-not-found");
    }
  }

  function testNoSession() {
    $this->testWall->endSession();
    try {
      $char = $this->createCharacter();
      $this->fail("Failed to throw exception with no active session");
    } catch (KeyedException $e) {
      $this->assertEqual($e->getKey(), "no-active-session");
    }
  }

  function testTitleTrimming() {
    $this->testFields['title'] = " 　abc ";
    $char = $this->createCharacter();
    $this->assertIdentical(@$char->title, "abc");
  }

  function testTitleIsOptional() {
    $this->testFields['title'] = null;
    $char = $this->createCharacter();
    $this->assertIdentical(@$char->title, null);
  }

  function testAuthorTrimming() {
    $this->testFields['author'] = " 　author ";
    $char = $this->createCharacter();
    $this->assertIdentical(@$char->author, "author");
  }

  function testAuthorOptional() {
    $this->testFields['author'] = null;
    $char = $this->createCharacter();
    $this->assertIdentical(@$char->author, null);
  }

  function testGroundOffset() {
    // If not set -> 0
    $fields = $this->testFields;
    unset($fields['groundOffset']);
    $char = $this->createCharacter($fields);
    $this->assertIdentical(@$char->groundOffset, 0.0);

    // Negative
    $fields['groundOffset'] = -0.5;
    $char = $this->createCharacter($fields);
    $this->assertIdentical(@$char->groundOffset, 0.0);

    // > 1
    $fields['groundOffset'] = 2.5;
    $char = $this->createCharacter($fields);
    $this->assertIdentical(@$char->groundOffset, 1.0);

    // Non float
    $fields['groundOffset'] = 'abc';
    $char = $this->createCharacter($fields);
    $this->assertIdentical(@$char->groundOffset, 0.0);
  }

  function testWidthHeightRequired() {
    foreach (array('width', 'height') as $field) {
      $fields = $this->testFields;
      unset($fields[$field]);
      try {
        $char = $this->createCharacter($fields);
        $this->fail("Failed to throw exception when missing required field: "
                    . $field);
      } catch (KeyedException $e) {
        $this->assertEqual($e->getKey(), "bad-request");
      }
    }
  }

  function testWidthHeightRange() {
    foreach (array('width', 'height') as $field) {
      $this->checkExceptionCreatingCharWithValue($field, -1, 'bad-request');
      $this->checkExceptionCreatingCharWithValue($field, 0, 'bad-request');
      $this->checkExceptionCreatingCharWithValue($field, 'abc', 'bad-request');
      $this->checkExceptionCreatingCharWithValue($field, 999999999999,
                                                 'bad-request');
    }
  }

  function checkExceptionCreatingCharWithValue($field, $value, $key) {
    $fields = $this->testFields;
    $fields[$field] = $value;
    try {
      $char = $this->createCharacter($fields);
      $this->fail("Failed to throw exception when setting $field to $value");
    } catch (KeyedException $e) {
      $this->assertEqual($e->getKey(), $key,
        "Unexpected exception key when setting $field to $value: %s");
    }
  }

  function testFile() {
    $char = $this->createCharacter();

    $expectedFile = Character::getFileForId($char->charId);
    $this->assertTrue(is_readable($expectedFile),
                      "SVG file not found at $expectedFile");
    $this->assertIdentical(@file_get_contents($expectedFile), $this->testSvg);
  }

  function testFileConfig() {
    // Test a trailing slash and whitespace is ignored
    global $config;
    $config['characters']['path'] .= '/ ';

    $char = $this->createCharacter();
    $expectedFile = Character::getFileForId($char->charId);
    $this->assertTrue(is_readable($expectedFile),
                      "SVG file not found at $expectedFile");
    $this->assertIdentical(@file_get_contents($expectedFile), $this->testSvg);
  }

  // XXX It would be good to test when the file can't be written but I can't 
  // find an easy way to do this on Windows (short of abstracting out the file 
  // system and using a mock object).

  function testFileExists() {
    $charA = $this->createCharacter();

    // Create a file where the next character *would* be saved
    $charAFile = Character::getFileForId($charA->charId);
    $nextId = $charA->charId + 1;
    $nextFile = preg_replace('/' . $charA->charId . '(\.\w+)$/',
                             "$nextId\\1", $charAFile);
    $handle = fopen($nextFile, 'w');
    fclose($handle);

    // Now try to create a character
    try {
      $charB = $this->createCharacter();
      $this->fail("Failed to throw exception when target file already exists");
    } catch (KeyedException $e) {
      $this->assertEqual($e->getKey(), 'save-failed',
        "Unexpected exception key when target file already exists");
    }

    // Check DB change was backed out
    $this->assertNull(Characters::getById($nextId));

    // Tidy up
    unlink($nextFile);
  }

  function testLargeFile() {
    // Work out what the current ID is
    $prevChar = $this->createCharacter();
    $nextId = $prevChar->charId + 1;

    // Work out the maximum
    global $config;
    if (!isset($config['characters']['max_size'])) {
      $config['characters']['max_size'] = 6000;
    }
    $maxLen = $config['characters']['max_size'];

    // Prepare SVG
    $svgHeader = "<svg><path d=\"";
    $svgFooter = "\"/></svg>";
    $pathData = 
      "M100 100C300,80 400,300 450,100 450,100  500,-100 -90,220110,150";
    $iterationsRequired =
      ceil(($maxLen - strlen($svgHeader) - strlen($svgFooter))
           / strlen($pathData));
    $bigSvg = $svgHeader;
    while ($iterationsRequired--)
      $bigSvg .= $pathData;
    $bigSvg .= $svgFooter;

    // Create a massive file
    try {
      $char = $this->createCharacter($this->testFields,
                                     $this->testWall->wallId, $bigSvg);
      $this->fail("Failed to throw exception with large SVG file");
    } catch (KeyedException $e) {
      $this->assertEqual($e->getKey(), 'character-too-large',
        "Unexpected exception key with large SVG file");
    }

    // Check DB change was backed out
    $this->assertNull(Characters::getById($nextId));
  }

  function testRawUrl() {
    $char = $this->createCharacter();
    $this->assertTrue(strlen(@$char->rawUrl) > 0, "Empty raw URL");
  }

  function testGalleryUrl() {
    $char = $this->createCharacter();
    $this->assertTrue(strlen(@$char->galleryUrl) > 0, "Empty gallery URL");
  }

  function testPreviewUrl() {
    $char = $this->createCharacter();
    $this->assertTrue(strlen(@$char->previewUrl) > 0, "Empty preview URL");
  }

  function testEmailUrl() {
    $char = $this->createCharacter();

    // The email URL should only be set if email is enabled so make sure it is
    global $config;
    $config['mail']['transport'] = 'smtp';
    $this->assertPattern('/' . $char->charId . '\/email$/', @$char->emailUrl);

    // Disable email
    unset($config['mail']['transport']);
    $this->assertFalse(isset($char->emailUrl));
  }

  function testGetById() {
    $createdChar = $this->createCharacter();
    $fetchedChar = Characters::getById($createdChar->charId);
    $this->assertIdentical($createdChar, $fetchedChar);
  }

  function testGetBadId() {
    $this->assertNull(Characters::getById(999999));
  }

  function testInvalidId() {
    foreach($this->invalidIds as $id) {
      try {
        $char = Characters::getById($id);
        $this->fail("Failed to throw exception with bad id: $id");
      } catch (KeyedException $e) {
        $this->assertEqual($e->getKey(), 'bad-request',
          "Unexpected exception key bad id '$id': %s");
      }
    }
  }

  function testGetBySession() {
    $wallId = $this->testWall->wallId;
    $sessionId = $this->testWall->latestSession['sessionId'];

    // Check initial state
    $chars = Characters::getBySession($wallId, $sessionId);
    $this->assertIdentical(count($chars), 0);

    // Add characters
    $charA = $this->createCharacter();
    $charB = $this->createCharacter();
    $charC = $this->createCharacter();

    // Check new state
    $chars = Characters::getBySession($wallId, $sessionId);
    $this->assertIdentical(count($chars), 3);
    $this->assertIdentical($chars[0], $charA);
    $this->assertIdentical($chars[1], $charB);
    $this->assertIdentical($chars[2], $charC);
  }

  function testBadSession() {
    $wallId = $this->testWall->wallId;
    $sessionId = $this->testWall->latestSession['sessionId'];
    $this->assertNull(Characters::getBySession($wallId, $sessionId + 1));
  }

  function testInvalidSession() {
    $goodWallId    = $this->testWall->wallId;
    $goodSessionId = $this->testWall->latestSession['sessionId'];

    foreach($this->invalidIds as $badId) {
      try {
        $char = Characters::getBySession($badId, $goodSessionId);
        $this->fail("Failed to throw exception with bad wall id: $badId");
      } catch (KeyedException $e) {
        $this->assertEqual($e->getKey(), 'bad-request',
          "Unexpected exception key bad wall id '$badId': %s");
      }
      try {
        $char = Characters::getBySession($goodWallId, $badId);
        $this->fail("Failed to throw exception with bad session id: $badId");
      } catch (KeyedException $e) {
        $this->assertEqual($e->getKey(), 'bad-request',
          "Unexpected exception key bad session id '$badId': %s");
      }
    }
  }

  function testGetByWall() {
    $wallId = $this->testWall->wallId;

    // Check initial state
    $chars = Characters::getByWall($wallId);
    $this->assertIdentical(count($chars), 0);

    // Add characters to first session
    $sessionA = $this->testWall->latestSession['sessionId'];
    $charAA = $this->createCharacter();
    $charAB = $this->createCharacter();

    // Add characters to a second session
    $this->testWall->startSession();
    $sessionB = $this->testWall->latestSession['sessionId'];
    $charBA = $this->createCharacter();

    // Add a third empty session
    // (These don't appear in the output)
    $this->testWall->startSession();
    $sessionC = $this->testWall->latestSession['sessionId'];

    // Check new state
    $chars = Characters::getByWall($wallId);
    $this->assertIdentical(count($chars), 2);
    $this->assertIdentical(count(@$chars[$sessionA]), 2);
    $this->assertIdentical(@$chars[$sessionA][0], $charAA);
    $this->assertIdentical(@$chars[$sessionA][1], $charAB);
    $this->assertIdentical(count(@$chars[$sessionB]), 1);
    $this->assertIdentical(@$chars[$sessionB][0], $charBA);
  }

  function testBadWall() {
    $this->assertNull(Characters::getByWall(99999));
  }

  function testInvalidWall() {
    foreach($this->invalidIds as $id) {
      try {
        $char = Characters::getByWall($id);
        $this->fail("Failed to throw exception with bad wall id: $id");
      } catch (KeyedException $e) {
        $this->assertEqual($e->getKey(), 'bad-request',
          "Unexpected exception key bad wall id '$id': %s");
      }
    }
  }

  function testDelete() {
    $char =
      Characters::create($this->testSvg, $this->testFields,
                         $this->testWall->wallId);
    $this->assertTrue(Characters::deleteById($char->charId));
    $this->assertNull(Characters::getById($char->charId));
    $this->assertFalse(Characters::deleteById($char->charId));

    $expectedFile = Character::getFileForId($char->charId);
    $this->assertFalse(file_exists($expectedFile),
                       "SVG still remains at $expectedFile");
  }

  function testDeleteFileLocked() {
    // Lock the character file
    $char =
      Characters::create($this->testSvg, $this->testFields,
                         $this->testWall->wallId);
    $file = $char->getFileForId($char->charId);
    $fp = fopen($file, "rw+");
    flock($fp, LOCK_EX);

    // Try to delete
    try {
      $result = Characters::deleteById($char->charId);
      $this->fail("Failed to throw exception when deleting locked file");
    } catch (KeyedException $e) {
      $this->assertEqual($e->getKey(), 'server-error',
        "Unexpected exception key when deleting locked file");
    }

    // Check database was not changed
    $this->assertNotNull(Characters::getById($char->charId));

    // Tidy up
    flock($fp, LOCK_UN);
    fclose($fp);
    $this->assertTrue(Characters::deleteById($char->charId));
    $this->assertFalse(file_exists($file));
  }

  function testDeleteFileMissing() {
    // Delete character file
    $char =
      Characters::create($this->testSvg, $this->testFields,
                         $this->testWall->wallId);
    $file = $char->getFileForId($char->charId);
    unlink($file);

    // Try to delete
    $result = Characters::deleteById($char->charId);

    // Check database WAS changed
    $this->assertNull(Characters::getById($char->charId));
    $this->assertFalse(Characters::deleteById($char->charId));
  }

  function testDeleteKeepFile() {
    $char =
      Characters::create($this->testSvg, $this->testFields,
                         $this->testWall->wallId);
    $this->assertTrue(Characters::deleteById($char->charId,
        CharacterDeleteMode::DeleteRecordOnly));
    $this->assertNull(Characters::getById($char->charId));
    $this->assertFalse(Characters::deleteById($char->charId));

    $expectedFile = Character::getFileForId($char->charId);
    $this->assertTrue(file_exists($expectedFile),
                      "SVG still remains at $expectedFile");
    if (file_exists($expectedFile)) {
      unlink($expectedFile);
    }
  }

  function testDeleteInvalidId() {
    foreach($this->invalidIds as $id) {
      try {
        $char = Characters::deleteById($id);
        $this->fail("Failed to throw exception with bad id: $id");
      } catch (KeyedException $e) {
        $this->assertEqual($e->getKey(), 'bad-request',
          "Unexpected exception key bad id '$id': %s");
      }
    }
  }

  function testDeletePreviewFiles() {
    $char =
      Characters::create($this->testSvg, $this->testFields,
                         $this->testWall->wallId);

    // Create a cached preview file
    $this->createPreviewFile($char);

    // Delete
    $this->assertTrue(Characters::deleteById($char->charId));

    // Check cached preview file is gone
    $previewFile = Character::getPreviewFile($char->charId);
    $this->assertFalse(file_exists($previewFile), "Preview file not removed");
  }

  function testDeleteBySession() {
    $wallId = $this->testWall->wallId;
    $sessionA = $this->testWall->latestSession['sessionId'];

    // Check initial state
    $result = Characters::deleteBySession($wallId, $sessionA);
    $this->assertIdentical($result, 0);

    // Add characters to first session
    $charAA = $this->createCharacter();
    $charAB = $this->createCharacter();

    // Start a new session and add characters
    $this->testWall->startSession();
    $sessionB = $this->testWall->latestSession['sessionId'];
    $charBA = $this->createCharacter();

    // Delete from first session
    $result = Characters::deleteBySession($wallId, $sessionA);
    $this->assertIdentical($result, 2);
    $chars = Characters::getBySession($wallId, $sessionA);
    $this->assertIdentical(count($chars), 0);
    $chars = Characters::getBySession($wallId, $sessionB);
    $this->assertIdentical(count($chars), 1);

    // Delete from second session
    $result = Characters::deleteBySession($wallId, $sessionB);
    $this->assertIdentical($result, 1);
    $chars = Characters::getBySession($wallId, $sessionB);
    $this->assertIdentical(count($chars), 0);
  }

  function testDeleteBySessionWithPreviews() {
    // Get wall and session
    $wallId = $this->testWall->wallId;
    $session = $this->testWall->latestSession['sessionId'];

    // Add character to session
    $char = $this->createCharacter();

    // Create a cached preview file
    $this->createPreviewFile($char);

    // Delete session characters
    $result = Characters::deleteBySession($wallId, $session);
    $this->assertIdentical($result, 1);

    // Check cached preview file is gone
    $previewFile = Character::getPreviewFile($char->charId);
    $this->assertFalse(file_exists($previewFile), "Preview file not removed");
  }

  function testDeleteBadSession() {
    $wallId = $this->testWall->wallId;
    $sessionId = $this->testWall->latestSession['sessionId'];
    $result = Characters::deleteBySession($wallId, $sessionId+1);
    $this->assertIdentical($result, null);
  }

  function testDeleteInvalidSession() {
    $goodWallId    = $this->testWall->wallId;
    $goodSessionId = $this->testWall->latestSession['sessionId'];

    foreach($this->invalidIds as $badId) {
      try {
        $char = Characters::deleteBySession($badId, $goodSessionId);
        $this->fail("Failed to throw exception with bad wall id: $badId");
      } catch (KeyedException $e) {
        $this->assertEqual($e->getKey(), 'bad-request',
          "Unexpected exception key bad wall id '$badId': %s");
      }
      try {
        $char = Characters::deleteBySession($goodWallId, $badId);
        $this->fail("Failed to throw exception with bad session id: $badId");
      } catch (KeyedException $e) {
        $this->assertEqual($e->getKey(), 'bad-request',
          "Unexpected exception key bad session id '$badId': %s");
      }
    }
  }

  function testDeleteBySessionFileLocked() {
    $wallId = $this->testWall->wallId;
    $sessionId = $this->testWall->latestSession['sessionId'];

    // Add characters
    $charA = $this->createCharacter();
    $charB = $this->createCharacter();
    $charC = $this->createCharacter();

    // Lock the second character file
    $file = Character::getFileForId($charB->charId);
    $fp = fopen($file, "rw+");
    flock($fp, LOCK_EX);

    // Try to delete session
    try {
      $result = Characters::deleteBySession($wallId, $sessionId);
      $this->fail("Failed to throw exception when deleting locked file");
    } catch (KeyedException $e) {
      $this->assertEqual($e->getKey(), 'server-error',
        "Unexpected exception key when deleting locked file");
    }

    // Check all files exist
    $this->assertTrue(file_exists(Character::getFileForId($charA->charId)));
    $this->assertTrue(file_exists(Character::getFileForId($charB->charId)));
    $this->assertTrue(file_exists(Character::getFileForId($charC->charId)));

    // Check database was not changed
    $chars = Characters::getBySession($wallId, $sessionId);
    $this->assertIdentical(count($chars), 3);

    // Unlock and delete properly
    flock($fp, LOCK_UN);
    fclose($fp);
    $result = Characters::deleteBySession($wallId, $sessionId);
    $this->assertIdentical($result, 3);
  }

  function testDeleteBySessionFileMissing() {
    $wallId = $this->testWall->wallId;
    $sessionId = $this->testWall->latestSession['sessionId'];

    // Add characters
    $charA = $this->createCharacter();
    $charB = $this->createCharacter();
    $charC = $this->createCharacter();

    // Delete second file
    $file = Character::getFileForId($charB->charId);
    unlink($file);

    // Delete session
    $result = Characters::deleteBySession($wallId, $sessionId);
    $this->assertIdentical($result, 3);

    // Check all files are gone
    $this->assertFalse(file_exists(Character::getFileForId($charA->charId)));
    $this->assertFalse(file_exists(Character::getFileForId($charB->charId)));
    $this->assertFalse(file_exists(Character::getFileForId($charC->charId)));

    // Check database is up-to-date
    $chars = Characters::getBySession($wallId, $sessionId);
    $this->assertIdentical(count($chars), 0);
  }

  function testDeleteBySessionKeepFiles() {
    $wallId = $this->testWall->wallId;
    $sessionId = $this->testWall->latestSession['sessionId'];

    // Add characters
    $charA = $this->createCharacter();
    $charB = $this->createCharacter();

    // Delete session
    $result =
      Characters::deleteBySession($wallId, $sessionId,
                                  CharacterDeleteMode::DeleteRecordOnly);
    $this->assertIdentical($result, 2);

    // Check files are still there
    $this->assertTrue(file_exists(Character::getFileForId($charA->charId)));
    $this->assertTrue(file_exists(Character::getFileForId($charB->charId)));

    // Check database is up-to-date
    $chars = Characters::getBySession($wallId, $sessionId);
    $this->assertIdentical(count($chars), 0);

    // Tidy up
    unlink(Character::getFileForId($charA->charId));
    unlink(Character::getFileForId($charB->charId));
  }

  function testDeleteByWall() {
    $wallId = $this->testWall->wallId;

    // Check initial state
    $result = Characters::deleteByWall($wallId);
    $this->assertIdentical($result, 0);

    // Add characters to first session
    $this->createCharacter();
    $this->createCharacter();

    // Start a new session and add characters
    $this->testWall->startSession();
    $this->createCharacter();

    // Delete characters
    $result = Characters::deleteByWall($wallId);
    $this->assertIdentical($result, 3);
    $chars = Characters::getByWall($wallId);
    $this->assertIdentical(count($chars), 0);
  }

  function testDeleteBadWall() {
    $wallId = $this->testWall->wallId;
    $result = Characters::deleteByWall($wallId+1);
    $this->assertIdentical($result, null);
  }

  function testDeleteInvalidWall() {
    foreach($this->invalidIds as $id) {
      try {
        $char = Characters::deleteByWall($id);
        $this->fail("Failed to throw exception with bad id: $id");
      } catch (KeyedException $e) {
        $this->assertEqual($e->getKey(), 'bad-request',
          "Unexpected exception key bad id '$id': %s");
      }
    }
  }

  function testDeleteWallKeepFiles() {
    $wallId = $this->testWall->wallId;
    $char = $this->createCharacter();

    // Delete characters
    $result =
      Characters::deleteByWall($wallId, CharacterDeleteMode::DeleteRecordOnly);
    $file = Character::getFileForId($char->charId);
    $this->assertTrue(file_exists($file));

    // Tidy up
    unlink($file);
  }

  // We don't bother testing Character::deleteByWall with regards to missing 
  // files, locked files etc. since we rely on the fact that it's using the same
  // underlying code as deleteBySession for that

  function testSetReadonly() {
    $char = $this->createCharacter();
    try {
      $char->charId = 5;
      $this->fail("Failed to throw exception when setting character ID");
    } catch (KeyedException $e) {
      $this->assertEqual($e->getKey(), "readonly-field");
    }
  }

  function testEmptySave() {
    $char = $this->createCharacter();
    $rv = $char->save();
    $this->assertTrue(is_array($rv),
      "Even when there is nothing to save,"
      . " the return value should be an array");
  }

  function testSetActive() {
    $char = $this->createCharacter();
    $this->assertIdentical(@$char->active, TRUE);

    // Update
    $char->active = FALSE;
    $rv = $char->save();
    $this->assertIdentical(@count($rv), 1,
      "Unexpected number of changed fields when changing active state");
    $this->assertIdentical(@$rv['active'], FALSE);

    // Check if has been saved
    $fetchedChar = Characters::getById($char->charId);
    $this->assertIdentical($fetchedChar->active, FALSE);

    // Check no change
    $char->active = FALSE;
    $rv = $char->save();
    $this->assertIdentical(@count($rv), 0, "Redundant change not detected");

    // Check value coercion
    $char->active = "true";
    $rv = $char->save();
    $this->assertIdentical(@count($rv), 1,
      "Unexpected number of changed fields when changing active state");
    $this->assertIdentical(@$rv['active'], TRUE);
  }

  function testSetX() {
    $char = $this->createCharacter();

    // Update
    $char->x = 0.432;
    $rv = $char->save();
    $this->assertIdentical(@$rv['x'], 0.432);

    // Check if has been saved
    $fetchedChar = Characters::getById($char->charId);
    $this->assertIdentical($fetchedChar->x, 0.432);

    // Check value coercion
    $char->x = "0.567";
    $rv = $char->save();
    $this->assertIdentical(@$rv['x'], 0.567);

    // Check out of range
    try {
      $char->x = 1.1;
      $this->fail("Failed to throw exception with bad x value");
    } catch (KeyedException $e) {
      $this->assertEqual($e->getKey(), "bad-request");
    }
  }

  function testAsArray() {
    $char = $this->createCharacter();

    $array = $char->asArray();
    $this->assertTrue(is_array($array));
    // Check read-only fields
    $this->assertIdentical(@$array['charId'], $char->charId);
    // Check regular fields
    $this->assertIdentical(@$array['wallId'], $char->wallId);
    // Check virtual fields
    $this->assertIdentical(@$array['galleryUrl'], $char->galleryUrl);
    // Check some fields are dropped
    $this->assertTrue(!array_key_exists('wall', $array));
  }

  function createPreviewFile($char) {
    $previewFile = Character::getPreviewFile($char->charId);
    file_put_contents($previewFile, "test");
    $this->assertTrue(file_exists($previewFile));
  }
}

?>
