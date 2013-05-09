<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once(dirname(__FILE__) . '/../../lib/parapara.inc');
require_once(dirname(__FILE__) . '/../ParaparaTestCase.php');

abstract class ParaparaUnitTestCase extends ParaparaTestCase {
  protected $testWall      = null;
  protected $testCharacter = null;
  protected $testSvg       = '<svg><circle cx="50" cy="50" r="100"></svg>';
  protected $invalidIds    = array(0, -3, "abc", null);

  function __construct($name = false) {
    parent::__construct($name);
  }

  function setUp($testCharacter = "create") {
    parent::setUp();

    // Test design
    list($designId) = $this->api->addDesign("test", array("test.jpg"));

    // Test wall
    $this->testWall = Walls::create("Test wall", $designId, "test@test.org");
    $this->testWall->startSession(null, gmdate("Y-m-d H:i:s"));

    // Test character
    if ($testCharacter != "Don't create test character") {
      $this->testCharacter =
        Characters::create($this->testSvg,
                           array(
                             'title' => 'Title',
                             'author' => 'Author',
                             'groundOffset' => 0,
                             'width' => 123,
                             'height' => 456
                           ),
                           $this->testWall->wallId);
    }
  }

  function tearDown() {
    // Remove test character
    if ($this->testCharacter) {
      Characters::deleteById($this->testCharacter->charId);
      $this->testCharacter = null;
    }

    // Remove test wall
    // XXX Replace this with a method call once we have it
    $this->api->removeWall($this->testWall->wallId);
    $this->testWall = null;

    // Clean up other resources
    $this->api->cleanUp();

    parent::tearDown();
  }
}

?>
