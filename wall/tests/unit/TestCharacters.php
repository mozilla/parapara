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
  }

  function testFileNoAccess() {
    // Should backout DB change
  }

  function testLargeFile() {
  }

  function testFileExists() {
  }

  function testEmailUrl() {
  }

  function testThumbnail() {
  }

  function testGalleryUrl() {
  }

  function testGetById() {
    // Bad ID
  }

  // testGetBySession
  // testGetByWall
  // testDelete
  // testDeleteFileLocked
  // testDeleteFileMissing
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
    // Remove character
    $query = 'DELETE FROM characters WHERE charId = ' . $charId;
    $res =& $this->getConnection()->query($query);
    if (PEAR::isError($res)) {
      die($res->getMessage() . ', ' . $res->getDebugInfo());
    }

    // Remove from list of createdCharacters
    while (($pos = array_search($charId, $this->createdCharacters)) !== FALSE) {
      array_splice($this->createdCharacters, $pos, 1);
    }
  }
}

?>
