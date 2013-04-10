<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../lib/parapara.inc');
require_once('simpletest/autorun.php');
require_once('WallTestCase.php');

class GetDesignsTestCase extends WallTestCase {

  function __construct($name = false) {
    parent::__construct($name);
  }

  function setUp() {
    $this->createTestDesign();
  }

  function tearDown() {
    $this->removeTestDesign();
  }

  function testGetDesigns() {
    $designs = $this->getDesigns();

    // Check the number of results
    $this->assertTrue(count($designs) >= 1,
                      "Too few designs: " . count($designs));

    // Check the format too
    foreach ($designs as $design) {
      $this->assertTrue(array_key_exists('name', $design),
          "No name key found in design: " . print_r($design, true));
      $this->assertTrue(array_key_exists('duration', $design),
          "No duration key found in design: " . print_r($design, true));
    }
  }

  function testDesign() {
    $testDesign = $this->getTestDesign();

    // Check duration
    $this->assertTrue($testDesign['duration'] == 3000,
      "Unexpected duration: " . $testDesign['duration']);
  }

  function testThumbnail() {
    $design = $this->getTestDesign();

    // No thumbnail entry should exist yet
    $this->assertTrue(!array_key_exists('thumbnail', $design),
                      "Unexpected thumbnail entry in design");

    // Add a JPG file
    $this->addPreviewFile('test.jpg');
    $this->checkForThumbnail('jpg');

    // Add a PNG file (should win)
    $this->addPreviewFile('test.png');
    $this->checkForThumbnail('png');

    // Remove PNG and JPG should be back
    unlink($this->testDesignFolder . 'preview/test.png');
    $this->checkForThumbnail('jpg');

    // Add GIF (JPG should win)
    $this->addPreviewFile('test.gif');
    $this->checkForThumbnail('jpg');

    // Remove JPG
    unlink($this->testDesignFolder . 'preview/test.jpg');
    $this->checkForThumbnail('gif');
  }

  function checkForThumbnail($extension) {
    $expected = "/designs/test/preview/test.$extension";
    $design = $this->getTestDesign();
    $this->assertTrue(array_key_exists('thumbnail', $design),
                      "Thumbnail entry should exist, expected: $expected");
    if (!array_key_exists('thumbnail', $design))
      return;
    $this->assertTrue($design['thumbnail'] == $expected,
      "Unexpected thumbnail file: " . $design['thumbnail']
      . ", expected: $expected");
  }

  function testVideo() {
    $design = $this->getTestDesign();

    // No video entry should exist yet
    $this->assertTrue(!array_key_exists('video', $design),
                      "Unexpected video entry in design");

    // Add MP4
    $this->addPreviewFile('test.mp4');
    $design = $this->getTestDesign();
    $this->assertTrue(array_key_exists('video', $design),
                      "Video entry should exist");
    $this->assertTrue(is_array($design['video']),
      "Video entry should be an array");
    $this->assertTrue(count($design['video']) === 1,
      "Should be only one video entry");
    $this->assertTrue($design['video'][0] == '/designs/test/preview/test.mp4',
      "Unexpected video file: " . $design['video'][0]);

    // Add WebM
    $this->addPreviewFile('test.webm');
    $design = $this->getTestDesign();
    $this->assertTrue(count($design['video']) === 2,
      "Should be two video entries");
    $this->assertTrue($design['video'][0] == '/designs/test/preview/test.mp4',
      "Unexpected video file: " . $design['video'][0]);
    $this->assertTrue($design['video'][1] == '/designs/test/preview/test.webm',
      "Unexpected video file: " . $design['video'][1]);
  }

  function getDesigns() {
    // Make request
    global $config;
    $url = $config['test']['wall_server'] . 'api/designs';
    $response = $this->get($url);

    // Check response
    $this->assertResponse(200);
    $this->assertMime('application/json; charset=UTF-8');

    // Parse response
    $designs = json_decode($response,true);
    $this->assertTrue($designs !== null,
                      "Failed to decode response: $response");
    return $designs;
  }

  function getTestDesign() {
    $designs = $this->getDesigns();

    $testDesign = null;
    foreach ($designs as $design) {
      $this->assertTrue(array_key_exists('name', $design),
          "No name key found in design: " . print_r($design, true));
      if ($design['name'] == 'test') {
        $testDesign = $design;
      }
    }
    $this->assertTrue($testDesign !== null, "Couldn't find test design");
    return $testDesign;
  }

  function addPreviewFile($filename) {
    $file = $this->testDesignFolder . 'preview/' . $filename;
    $handle = fopen($file, 'w');
    fclose($handle);
  }
}

?>
