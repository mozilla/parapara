<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../lib/parapara.inc');
require_once('simpletest/autorun.php');
require_once('APITestCase.php');

class SetWallTestCase extends APITestCase {

  private $testWallId = null;

  function __construct($name = false) {
    parent::__construct($name);
  }

  function setUp() {
    parent::setUp();

    // Create test wall
    $this->api->login();
    $wall = $this->api->createWall('ABC', $this->testDesignId);
    $this->testWallId = $wall['wallId'];
  }

  function tearDown() {
    // Clear test wall ID
    $this->testWallId = null;
    parent::tearDown();
  }

  function testSetName() {
    // Update title
    $result =
      $this->api->updateWall($this->testWallId, array('name' => 'ABCD'));
    $this->assertTrue(!array_key_exists('error_key', $result),
                      "Failed to set wall name " . @$result['error_key']);
    $this->assertEqual(@$result['name'], 'ABCD');

    // Check it actually updated the wall
    $wall = $this->api->getWall($this->testWallId);
    $this->assertEqual(@$wall['name'], 'ABCD');

    // Try setting the same title--nothing should be returned since nothing 
    // changed
    $result =
      $this->api->updateWall($this->testWallId, array('name' => 'ABCD'));
    $this->assertEqual(count($result), 0);

    // Test changes to capitalization are accepted
    $result = $this->api->updateWall($this->testWallId,
      array('name' => "abcd"));
    $this->assertEqual(@$result['name'], 'abcd');

    // Trimming
    $result = $this->api->updateWall($this->testWallId,
      array('name' => " \twall name\n　"));
    $this->assertEqual(@$result['name'], 'wall name');

    // Non-ASCII
    $result =
      $this->api->updateWall($this->testWallId, array('name' => 'テスト'));
    $this->assertEqual(@$result['name'], 'テスト');

    // Empty title
    $result = $this->api->updateWall($this->testWallId, array('name' => ""));
    $this->assertTrue(@$result['error_key'] == 'empty-name',
                      "Made wall name empty");

    // Whitespace only
    $result =
      $this->api->updateWall($this->testWallId, array('name' => " \t\n　"));
    $this->assertTrue(@$result['error_key'] == 'empty-name',
                      "Made wall name whitespace only");

    // Duplicate title
    $duplicateWall = $this->api->createWall('Wall #2', $this->testDesignId);
    $duplicateWallId = $duplicateWall['wallId'];
    $result =
      $this->api->updateWall($this->testWallId, array('name' => "Wall #2"));
    $this->assertTrue(@$result['error_key'] == 'duplicate-name',
                      "Made duplicate wall name");
  }

  function testSetUrlPath() {
    // Update url path
    $result =
      $this->api->updateWall($this->testWallId, array('urlPath' => 'abc-d'));
    $this->assertTrue(!array_key_exists('error_key', $result),
                      "Failed to set wall url " . @$result['error_key']);
    $this->assertPattern("/\/abc-d$/", @$result['wallUrl']);
    $this->assertPattern("/\/abc-d$/", @$result['editorUrl']);

    // Not really sure how best to test the short URL short of making a mock 
    // shortener service

    // Check it was actually set
    $wall = $this->api->getWall($this->testWallId);
    $this->assertPattern("/\/abc-d$/", @$wall['wallUrl']);
    $this->assertPattern("/\/abc-d$/", @$wall['editorUrl']);

    // Attempt to set wallUrl directly
    $result =
      $this->api->updateWall($this->testWallId, array('wallUrl' => 'abc-d'));
    $this->assertEqual(@$result['error_key'], 'readonly-field');

    // Set editorUrl
    $result = $this->api->updateWall($this->testWallId,
      array('editorUrl' => 'abc-d'));
    $this->assertEqual(@$result['error_key'], 'readonly-field');

    // Set editorUrlShort
    $result = $this->api->updateWall($this->testWallId,
      array('editorUrlShort' => 'abc-d'));
    $this->assertEqual(@$result['error_key'], 'readonly-field');

    // Set same
    $result =
      $this->api->updateWall($this->testWallId, array('urlPath' => 'abc-d'));
    $this->assertEqual(count($result), 0);

    // Non-ASCII
    $result = $this->api->updateWall($this->testWallId,
      array('urlPath' => 'テスト'));
    $this->assertPattern("/\/" . rawurlencode("テスト") . "$/",
      @$result['wallUrl']);

    // Bad URL -- slashes
    $result =
      $this->api->updateWall($this->testWallId, array('urlPath' => 'ab/cd'));
    $this->assertPattern("/\/ab-cd$/", @$result['wallUrl']);

    // Bad URL -- dots
    $result = $this->api->updateWall($this->testWallId,
       array('urlPath' => '../abcd'));
    $this->assertPattern("/\/---abcd$/", @$result['wallUrl']);

    // Empty URL
    $result = $this->api->updateWall($this->testWallId, array('urlPath' => ''));
    $this->assertEqual(@$result['error_key'], 'bad-path');

    // Whitespace only
    $result =
      $this->api->updateWall($this->testWallId, array('urlPath' => " \t"));
    $this->assertEqual(@$result['error_key'], 'bad-path');

    // Wide whitespace too
    $result =
      $this->api->updateWall($this->testWallId, array('urlPath' => '　'));
    $this->assertEqual(@$result['error_key'], 'bad-path');

    // Duplicate URL
    $duplicateWall = $this->api->createWall('Wall 2', $this->testDesignId);
    $duplicateWallId = $duplicateWall['wallId'];
    $result = $this->api->updateWall($this->testWallId,
      array('urlPath' => "wall-2"));
    $this->assertEqual(@$result['error_key'], 'duplicate-path');
  }

  function testNotFound() {
    $result = $this->api->updateWall(500, array('name' => 'ABCD'));
    $this->assertTrue(@$result['error_key'] == 'not-found',
                      "Found non-existent wall");
  }

  function testSetSomeoneElsesWall() {
    // Login as someone else
    $this->api->login('abc@abc.org');
    $result =
      $this->api->updateWall($this->testWallId, array('name' => 'ABCD'));
    $this->assertEqual(@$result['error_key'], 'no-auth');
    $this->api->logout();
  }

  function testUnrecognizedParam() {
    // Update mispelled param
    $result = $this->api->updateWall($this->testWallId, array('nam' => 'ABCD'));
    $this->assertEqual(@$result['error_key'], 'unknown-field');
  }

  function testId() {
    // It shouldn't be possible to change the wall ID 
    $result = $this->api->updateWall($this->testWallId, array('wallId' => 5));
    $this->assertEqual(@$result['error_key'], 'readonly-field');

    // Variation on the theme
    $result = $this->api->updateWall($this->testWallId, array('id' => 5));
    $this->assertEqual(@$result['error_key'], 'unknown-field');
  }

  function testNoChange() {
    // Change nothing
    $result = $this->api->updateWall($this->testWallId, array());
    $this->assertTrue(!array_key_exists('error_key', $result),
                      "Failed to do nothing " . @$result['error_key']);
    $this->assertEqual(count(@$result), 0);
  }

  function testSetMultiple() {
    // Update title and event description
    $result = $this->api->updateWall($this->testWallId,
      array('name' => 'ABCD',
            'duration' => 1234));
    $this->assertTrue(!array_key_exists('error_key', $result),
                      "Failed to set wall name and duration"
                      . @$result['error_key']);
    $this->assertTrue(@count($result) >= 2);
    $this->assertEqual(@$result['name'], 'ABCD');
    $this->assertEqual(@$result['duration'], 1234);

    // Check it actually updated the wall
    $wall = $this->api->getWall($this->testWallId);
    $this->assertEqual(@$wall['name'], 'ABCD');
    $this->assertEqual(@$wall['duration'], 1234);
  }

  function testSetDesign() {
    // Update design
    // (We are just going to guess here that there is a design with ID 1 and 
    // it's not the test design)
    $result = $this->api->updateWall($this->testWallId, array('designId' => 1));
    $this->assertTrue(!array_key_exists('error_key', $result),
                      "Failed to update design" . @$result['error_key']);
    $this->assertEqual(@$result['designId'], 1);
    $this->assertTrue(strlen(@$result['thumbnail']) > 0,
                      "Thumbnail not returned when updating design");
    $this->assertTrue(intval(@$result['defaultDuration']) > 0,
                      "Default duration not returned when updating design");

    // Unrecognized design
    $result =
      $this->api->updateWall($this->testWallId, array('designId' => 999));
    $this->assertEqual(@$result['error_key'], 'bad-design');

    // Test non-number
    $result =
      $this->api->updateWall($this->testWallId, array('designId' => 'abc'));
    $this->assertEqual(@$result['error_key'], 'bad-request');

    // Test setting defaultDuration or thumbnail fails
    $result =
      $this->api->updateWall($this->testWallId, array('thumbnail' => 'abc'));
    $this->assertEqual(@$result['error_key'], 'readonly-field');
    $result = $this->api->updateWall($this->testWallId,
                                array('defaultDuration' => 5));
    $this->assertEqual(@$result['error_key'], 'readonly-field');
  }

  function testSetDuration() {
    // Update duration
    $result =
      $this->api->updateWall($this->testWallId, array('duration' => 3000));
    $this->assertTrue(!array_key_exists('error_key', $result),
                      "Failed to update duration " . @$result['error_key']);
    $this->assertEqual(@$result['duration'], 3000);
    $this->assertTrue(@$result['defaultDuration'] > 0,
                      "Default duration not returned when updating design");

    // Check it was actually set
    $wall = $this->api->getWall($this->testWallId);
    $this->assertEqual(3000, @$wall['duration']);

    // Same value
    $result =
      $this->api->updateWall($this->testWallId, array('duration' => 3000));
    $this->assertEqual(count($result), 0);

    // String value
    // (It's ok if this doesn't work but since it seems to, we should test it)
    $result =
      $this->api->updateWall($this->testWallId, array('duration' => "5000"));
    $this->assertEqual(@$result['duration'], 5000);

    // Out of range (negative)
    $result =
      $this->api->updateWall($this->testWallId, array('duration' => -100));
    $this->assertEqual(@$result['error_key'], 'bad-request');

    // Out of range (zero)
    $result =
      $this->api->updateWall($this->testWallId, array('duration' => 0));
    $this->assertEqual(@$result['error_key'], 'bad-request');

    // Out of range (overflow)
    $result = $this->api->updateWall($this->testWallId,
                                array('duration' => 2147483648));
    $this->assertEqual(@$result['error_key'], 'bad-request');

    // Not numeric
    $result =
      $this->api->updateWall($this->testWallId, array('duration' => "abc"));
    $this->assertEqual(@$result['error_key'], 'bad-request');

    // Not numeric (2)
    // (This checks we're not just blindly applying intval)
    $result = $this->api->updateWall($this->testWallId,
      array('duration' => "12 grapes"));
    $this->assertEqual(@$result['error_key'], 'bad-request');

    // Null ok
    $result =
      $this->api->updateWall($this->testWallId, array('duration' => null));
    $this->assertTrue(!array_key_exists('error_key', $result),
                      "Failed to update duration to null: "
                      . @$result['error_key']);
    $this->assertEqual(@$result['duration'], null);
    $this->assertTrue(@$result['defaultDuration'] > 0,
                      "Default duration should be non-null even " .
                      "if duration is null");

    // Check it was actually set
    $wall = $this->api->getWall($this->testWallId);
    $this->assertEqual(null, @$wall['duration']);

    // Same value
    $result =
      $this->api->updateWall($this->testWallId, array('duration' => null));
    $this->assertEqual(count($result), 0);

    // String "null"
    $result =
      $this->api->updateWall($this->testWallId, array('duration' => "null"));
    $this->assertTrue(!array_key_exists('error_key', $result),
                      "Failed to update duration to null: "
                      . @$result['error_key']);
    $this->assertEqual(@$result['duration'], null);

    // Test you can't set defaultDuration
    $result = $this->api->updateWall($this->testWallId,
                                array('defaultDuration' => 5000));
    $this->assertEqual(@$result['error_key'], 'readonly-field');
  }
}
