<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../lib/parapara.inc');
require_once('simpletest/autorun.php');

class AllTests extends TestSuite {
  function AllTests() {
    parent::__construct();
    $this->addFile('TestGetDesigns.php');
    $this->addFile('TestCreateWall.php');
    $this->addFile('TestGetWall.php');
    $this->addFile('TestSetWall.php');
    $this->addFile('TestSessions.php');
    $this->addFile('TestUserSummary.php');
  }
}
?>
