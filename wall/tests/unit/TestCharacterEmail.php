<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once(dirname(__FILE__) . '/../../lib/parapara.inc');
require_once(dirname(__FILE__) . '/ParaparaUnitTestCase.php');
require_once('characters.inc');
require_once('characters.email.inc');

class TestCharacterEmail extends ParaparaUnitTestCase {
  function __construct($name = false) {
    parent::__construct($name);
  }

  function setUp() {
    parent::setUp();

    global $config;
    $config['mail']['transport'] = 'mock';
  }

  function testAddress() {
  }

  function testSend() {
  }
}
