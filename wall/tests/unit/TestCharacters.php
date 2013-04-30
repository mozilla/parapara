<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once(dirname(__FILE__) . '/../../lib/parapara.inc');
require_once(dirname(__FILE__) . '/../ParaparaTestCase.php');
require_once('simpletest/autorun.php');
require_once('characters.inc');

define("NOT_SET", "This parameter is not set");

class TestCharacters extends ParaparaTestCase {
  protected $testMetadata =
    array(
      'title' => 'Test title',
      'author' => 'Test author',
      'groundOffset' => 0.1,
      'width' => 123,
      'height' => 456);
  protected $testSvg  = '<svg><circle cx="50" cy="50" r="100"></svg>';
  protected $testWall = null;

  function __construct($name = false) {
    parent::__construct($name);
  }

  function setUp() {
    parent::setUp();
    list($designId) = $this->api->addDesign("test", array("test.jpg"));

    $this->testWall = Walls::create("Test wall", $designId, "test@test.org");
    $this->testWall->startSession(null, gmdate("Y-m-d H:i:s"));
  }

  function tearDown() {
    // Remove characters
    while (count($this->createdCharacters)) {
      $this->removeCharacter($this->createdCharacters[0]);
    }

    // Remove test wall
    // XXX Replace this with a method call once we have it
    $this->api->removeWall($this->testWall->wallId);
    $this->testWall = null;

    // Clean up other resources
    $this->api->cleanUp();
    parent::tearDown();
  }

  function testCreateCharacter() {
    $char = $this->createCharacter();

    $this->assertIdLike(@$char->charId, "Bad character ID: %s");
    $this->assertIdLike(@$char->wallId, "Bad wall ID: %s");
    $this->assertIdLike(@$char->sessionId, "Bad session ID: %s");

    $this->assertEqual(@$char->title, $this->testMetadata['title']);
    $this->assertEqual(@$char->author, $this->testMetadata['author']);
    $this->assertEqual(@$char->groundOffset,
                       $this->testMetadata['groundOffset']);
    $this->assertEqual(@$char->width, $this->testMetadata['width']);
    $this->assertEqual(@$char->height, $this->testMetadata['height']);
    $this->assertPattern($this->dateRegEx, @$char->createDate);
    $this->assertEqual(@$char->active, TRUE);
    $this->assertWithinMargin(@$char->x,
      floor($this->testWall->getCurrentProgress() * 1000), 10);
  }

  function testWallNotFound() {
    try {
      $char = $this->createCharacter($this->testMetadata, 0);
      $this->fail("Failed to throw exception with bad Wall ID");
    } catch (KeyedException $e) {
      $this->assertEqual($e->getKey(), "not-found");
    }
  }

  function testNoSession() {
    $this->testWall->endSession($this->testWall->latestSession['sessionId'],
                                gmdate("Y-m-d H:i:s"));
    try {
      $char = $this->createCharacter();
      $this->fail("Failed to throw exception with no active session");
    } catch (KeyedException $e) {
      $this->assertEqual($e->getKey(), "no-active-session");
    }
  }

  function testTitleTrimming() {
    $this->testMetadata['title'] = " 　abc ";
    $char = $this->createCharacter();
    $this->assertEqual(@$char->title, "abc");
  }

  function testTitleIsOptional() {
    $this->testMetadata['title'] = null;
    $char = $this->createCharacter();
    $this->assertEqual(@$char->title, null);
  }

  function testAuthorTrimming() {
    $this->testMetadata['author'] = " 　author ";
    $char = $this->createCharacter();
    $this->assertEqual(@$char->author, "author");
  }

  function testAuthorOptional() {
    $this->testMetadata['author'] = null;
    $char = $this->createCharacter();
    $this->assertEqual(@$char->author, null);
  }

  function testGroundOffset() {
    // If not set -> 0
    $metadata = $this->testMetadata;
    unset($metadata['groundOffset']);
    $char = $this->createCharacter($metadata);
    $this->assertEqual(@$char->groundOffset, 0);

    // Negative
    $metadata['groundOffset'] = -0.5;
    $char = $this->createCharacter($metadata);
    $this->assertEqual(@$char->groundOffset, 0);

    // > 1
    $metadata['groundOffset'] = 2.5;
    $char = $this->createCharacter($metadata);
    $this->assertEqual(@$char->groundOffset, 1);

    // Non float
    $metadata['groundOffset'] = 'abc';
    $char = $this->createCharacter($metadata);
    $this->assertEqual(@$char->groundOffset, 0);
  }

  function testWidthHeightRequired() {
    foreach (array('width', 'height') as $field) {
      $metadata = $this->testMetadata;
      unset($metadata[$field]);
      try {
        $char = $this->createCharacter($metadata);
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
    $metadata = $this->testMetadata;
    $metadata[$field] = $value;
    try {
      $char = $this->createCharacter($metadata);
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
    $this->assertEqual(@file_get_contents($expectedFile), $this->testSvg);
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
      $char = $this->createCharacter($this->testMetadata,
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

  function testThumbnailUrl() {
    $char = $this->createCharacter();
    $this->assertTrue(strlen(@$char->thumbnailUrl) > 0, "Empty thumbnail URL");
  }

  function testEmailUrl() {
    $char = $this->createCharacter();
    $this->assertPattern('/' . $char->charId . '\/email$/', @$char->emailUrl);
  }

  function testGetById() {
    // Test Bad ID
  }

  // testGetBySession
  // testGetByWall

  function testDelete() {
    $char =
      Characters::create($this->testSvg, $this->testMetadata,
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
      Characters::create($this->testSvg, $this->testMetadata,
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
      Characters::create($this->testSvg, $this->testMetadata,
                         $this->testWall->wallId);
    $file = $char->getFileForId($char->charId);
    unlink($file);

    // Try to delete
    $result = Characters::deleteById($char->charId);

    // Check database WAS changed
    $this->assertNull(Characters::getById($char->charId));
    $this->assertFalse(Characters::deleteById($char->charId));
  }

  // testDeleteBySession
  // testDeleteByWall
  // testSetActive
  // testSetX
  // testSetTitle
  // testSetAuthor

  protected $createdCharacters = array();

  // Utility wrapper that calls Characters::create and tracks the character so 
  // it will be deleted automatically on tear-down
  function createCharacter($metadata = NOT_SET, $wallId = NOT_SET,
                           $svg = NOT_SET)
  {
    // Fill in default parameters
    if ($metadata === NOT_SET)
      $metadata = $this->testMetadata;
    if ($wallId === NOT_SET)
      $wallId = $this->testWall->wallId;
    if ($svg === NOT_SET)
      $svg = $this->testSvg;

    $char = Characters::create($svg, $metadata, $wallId);
    if ($char !== null && isset($char->charId)) {
      array_push($this->createdCharacters, $char->charId);
    }
    return $char;
  }

  function removeCharacter($charId) {
    Characters::deleteById($charId);

    // Remove from list of createdCharacters
    while (($pos = array_search($charId, $this->createdCharacters)) !== FALSE) {
      array_splice($this->createdCharacters, $pos, 1);
    }
  }
}

?>
