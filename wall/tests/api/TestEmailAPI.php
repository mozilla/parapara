<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once(dirname(__FILE__) . '/../../lib/parapara.inc');
require_once(dirname(__FILE__) . '/APITestCase.php');
require_once('simpletest/autorun.php');

class TestEmailAPI extends APITestCase {

  protected $testCharacter = null;

  function __construct($name = false) {
    parent::__construct($name);
  }

  function setUp() {
    parent::setUp();

    // Create test wall
    $this->api->login();
    $wall = $this->api->createWall('Test wall', $this->testDesignId);
    $this->api->logout();

    // Create test character
    $this->testCharacter = $this->api->createCharacter($wall['wallId']);
  }

  function testSendEmail() {
    // Try emailing the character
    $fields = array(
      'address' => 'test@test.org',
      'locale' => 'en-US'
    );
    $result =
      $this->api->emailCharacterByUrl($this->testCharacter['emailUrl'],
                                      $fields);
    $this->assertTrue(!array_key_exists('error_key', $result),
      "Failed to email character: " . print_r($result, true));
  }
  
  function testNoAddress() {
    $fields = array('locale' => 'en-US');
    $result =
      $this->api->emailCharacterByUrl($this->testCharacter['emailUrl'],
                                      $fields);
    $this->assertEqual(@$result['error_key'], 'bad-email');
  }

  function testBadAddress() {
    $fields = array(
      'address' => '123',
      'locale' => 'en-US'
    );
    $result =
      $this->api->emailCharacterByUrl($this->testCharacter['emailUrl'],
                                      $fields);
    $this->assertEqual(@$result['error_key'], 'sending-failed');
  }

  function testBadCharacter() {
    $url = str_replace($this->testCharacter['charId'],
                       '9999999',
                       $this->testCharacter['emailUrl']);
    $fields = array(
      'address' => 'test@test.org',
      'locale' => 'en-US'
    );
    $result =
      $this->api->emailCharacterByUrl($url, $fields);
    $this->assertEqual(@$result['error_key'], 'char-not-found');
  }

  function testNoLocale() {
    // Should still work
    $fields = array('address' => 'test@test.org');
    $result =
      $this->api->emailCharacterByUrl($this->testCharacter['emailUrl'],
                                      $fields);
    $this->assertTrue(!array_key_exists('error_key', $result),
      "Failed to email character without locale: " . print_r($result, true));
  }
}
?>
