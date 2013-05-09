<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once(dirname(__FILE__) . '/../../lib/parapara.inc');
require_once('simpletest/autorun.php');

class UnitTestSuite extends TestSuite {
  function UnitTestSuite() {
    parent::__construct();
    $this->TestSuite('Unit tests');
    $this->addFile(dirname(__FILE__) . '/TestCharacters.php');
    $this->addFile(dirname(__FILE__) . '/TestCharacterEmail.php');
  }
}
?>
