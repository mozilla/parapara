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
    $this->assertEqual(@$char->charId, 1);
    $this->assertEqual(@$char->wallId, 1);
    $this->assertEqual(@$char->sessionId, 1);
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

    // Test file
    // Test email URL
  }

  function testWallNotFound() {
  }

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

  // Wall ID not found
  // Check when no session is available
  // Titles are trimmed
  // Titles are optional
  // Authors are trimmed
  // Authors are optional
  // Negative ground offset
  // Negative / zero width / height
  // Negative x
  // File handling
  //   -- record is backed out if not writeable
  //   -- large files are rejected
}

?>
