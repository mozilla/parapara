<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once(dirname(__FILE__) . '/../../lib/parapara.inc');
require_once(dirname(__FILE__) . '/ParaparaUnitTestCase.php');
require_once('characters.inc');
require_once('characters.email.inc');

class TestCharacterEmail extends ParaparaUnitTestCase {
  protected $testMailer  = null;
  protected $testAddress = "test@test.org";

  function __construct($name = false) {
    parent::__construct($name);
  }

  function setUp() {
    parent::setUp();

    $this->testMailer =& Mail::factory('mock');

    // Make sure a transport is set initially
    global $config;
    $config['mail']['transport'] = 'mock';
  }

  function testEnabled() {
    // Remove mail configuration in settings
    global $config;
    unset($config['mail']['transport']);
    $this->assertFalse(CharacterEmailer::isEmailEnabled());
    try {
      CharacterEmailer::sendEmail($this->testCharacter, $this->testAddress);
      $this->fail("Failed to throw exception with no mail transport");
    } catch (KeyedException $e) {
      $this->assertEqual($e->getKey(), "email-disabled");
    }

    // Supply mailer manually
    try {
      CharacterEmailer::sendEmail($this->testCharacter, $this->testAddress,
        null, $this->testMailer);
    } catch (KeyedException $e) {
      $this->fail("Failed to send mail with manual mailer, exception: "
                  . $e->getKey() . ", " . $e->getMessage());
    }
  }

  function testAddress() {
    try {
      CharacterEmailer::sendEmail($this->testCharacter, "");
      $this->fail("Failed to throw exception with no email address");
    } catch (KeyedException $e) {
      $this->assertEqual($e->getKey(), "bad-email");
    }
  }

  function testSend() {
    global $config;

    // Send
    CharacterEmailer::sendEmail($this->testCharacter, $this->testAddress,
                                null, $this->testMailer);

    // Check message was sent
    $this->assertEqual(count($this->testMailer->sentMessages), 1);
    $message = @$this->testMailer->sentMessages[0];

    // Check address
    $this->assertEqual(@$message['recipients'], $this->testAddress);

    // Check headers
    $this->assertEqual(@$message['headers']['From'], $config['mail']['from']);

    // Check body
    $this->assertTrue(strlen(@$message['body']) > 0);
    $this->assertTrue(
      strpos(@$message['body'], $this->testCharacter->galleryUrl) !== false);
    $this->assertTrue(
      strpos(@$message['body'], $this->testCharacter->title) !== false);
    $this->assertTrue(
      strpos(@$message['body'], $this->testCharacter->author) !== false);
  }

  function testBadLocale() {
    // Send
    CharacterEmailer::sendEmail($this->testCharacter, $this->testAddress,
                                'abc', $this->testMailer);

    // Check message was sent
    $this->assertEqual(count($this->testMailer->sentMessages), 1);
    $message = @$this->testMailer->sentMessages[0];
    $this->assertTrue(strlen(@$message['body']) > 0);
  }

  function testGoodLocale() {
    // Get default body
    CharacterEmailer::sendEmail($this->testCharacter, $this->testAddress,
                                null, $this->testMailer);

    // Send with Japanese template
    CharacterEmailer::sendEmail($this->testCharacter, $this->testAddress,
                                'ja', $this->testMailer);

    // Check messages were sent
    $this->assertEqual(count($this->testMailer->sentMessages), 2);

    // Compare bodies
    $defaultMessage  = @$this->testMailer->sentMessages[0];
    $japaneseMessage = @$this->testMailer->sentMessages[1];
    $this->assertTrue(strlen(@$defaultMessage['body']) > 0);
    $this->assertTrue(strlen(@$japaneseMessage['body']) > 0);
    $this->assertNotEqual($defaultMessage, $japaneseMessage);
  }
}
