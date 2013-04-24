<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once(dirname(__FILE__) . '/../../lib/parapara.inc');
require_once(dirname(__FILE__) . '/../ParaparaTestCase.php');
require_once('simpletest/autorun.php');
require_once('characters.inc');

class TestCharacters extends ParaparaTestCase {
  protected $testSvg = '<svg><circle cx="50" cy="50" r="100"></svg>';
  protected $testWallId = null;

  function __construct($name = false) {
    parent::__construct($name);
  }

  function setUp() {
    parent::setUp();
    list($designId) = $this->api->addDesign("test", array("test.jpg"));
    $this->api->login();
    $wall = $this->api->createWall('Test', $designId);
    $this->testWallId = $wall['wallId'];
  }

  function tearDown() {
    // Remove characters
    while (count($this->createdCharacters)) {
      $this->removeCharacter($this->createdCharacters[0]);
    }
    // Clean up other resources
    $this->api->cleanUp();
    parent::tearDown();
  }

  function testCreateCharacter() {
    $metadata = array(
      'title' => 'char title',
      'author' => 'char author',
      'groundOffset' => 0.3,
      'width' => 123,
      'height' => 456);
    $char =
      $this->createCharacter($metadata, $this->testWallId, $this->testSvg);
    $this->assertEqual(@$char->charId, 1);
    $this->assertEqual(@$char->wallId, 1);
    $this->assertEqual(@$char->sessionId, 1);
    $this->assertEqual(@$char->title, 'char title');
    // Test x
    // Test date
    // Test active
  }

  protected $createdCharacters = array();

  // Utility wrapper that calls Characters::create and tracks the character so 
  // it will be deleted automatically on tear-down
  function createCharacter($metadata, $wallId = -1000, $svg = -1000)
  {
    // Fill in default parameters (yep, this is weird)
    if ($wallId == -1000)
      $wallId = $this->testWallId;
    if ($svg == -1000)
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
