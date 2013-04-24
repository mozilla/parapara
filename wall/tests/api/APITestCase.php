<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once(dirname(__FILE__) . '/../ParaparaTestCase.php');

abstract class APITestCase extends ParaparaTestCase {

  // Create one test design by default
  protected $testDesign       = null;
  protected $testDesignId     = null;
  protected $testDesignFolder = null;

  function __construct($name = false) {
    parent::__construct($name);
  }

  function setUp() {
    parent::setUp();
    $this->testDesign = "test";
    list($this->testDesignId, $this->testDesignFolder) =
      $this->api->addDesign($this->testDesign, array("test.jpg"));
  }

  function tearDown() {
    $this->api->cleanUp();
    parent::tearDown();
  }
}

?>
