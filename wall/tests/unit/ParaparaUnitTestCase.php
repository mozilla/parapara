<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once(dirname(__FILE__) . '/../../lib/parapara.inc');
require_once(dirname(__FILE__) . '/../ParaparaTestCase.php');

define("NOT_SET", "This parameter is not set");

abstract class ParaparaUnitTestCase extends ParaparaTestCase {
  protected $testWall      = null;
  protected $testCharacter = null;
  protected $invalidIds    = array(0, -3, "abc", null);

  // Test character data
  protected $testCharacterSvg = '<svg><circle cx="50" cy="50" r="100"></svg>';
  protected $testCharacterFields = array(
                                     'title' => 'Test title',
                                     'author' => 'Test author',
                                     'groundOffset' => 0.1,
                                     'width' => 123.0,
                                     'height' => 456.0);

  // Array to track all created characters so we can clean them up
  protected $createdCharacters = array();

  function __construct($name = false) {
    parent::__construct($name);
  }

  function setUp($testCharacter = "create") {
    parent::setUp();

    // Login
    $_SESSION['email'] = "test@test.org";

    // Test design
    list($designId) = $this->api->addDesign("test", array("test.jpg"));

    // Test wall
    $this->testWall = Walls::create("Test wall", $designId);
    $this->testWall->startSession();

    // Test character
    if ($testCharacter != "Don't create test character") {
      $this->testCharacter = $this->createCharacter();
    }
  }

  function tearDown() {
    // Remove test characters
    while (count($this->createdCharacters)) {
      $this->removeCharacter($this->createdCharacters[0]);
    }
    $this->testCharacter = null;

    // Remove test wall
    // XXX Replace this with a method call once we have it
    $this->api->removeWall($this->testWall->wallId);
    $this->testWall = null;

    // Clean up other resources
    $this->api->cleanUp();

    // Logout
    unset($_SESSION['email']);

    parent::tearDown();
  }

  // Utility wrapper that calls Characters::create and tracks the character so 
  // it will be deleted automatically on tear-down
  function createCharacter($fields = NOT_SET, $wallId = NOT_SET, $svg = NOT_SET)
  {
    // Fill in default parameters
    if ($fields === NOT_SET)
      $fields = $this->testCharacterFields;
    if ($wallId === NOT_SET)
      $wallId = $this->testWall->wallId;
    if ($svg === NOT_SET)
      $svg = $this->testCharacterSvg;

    $char = Characters::create($svg, $fields, $wallId);
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
