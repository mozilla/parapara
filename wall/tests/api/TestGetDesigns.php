<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../lib/parapara.inc');
require_once('simpletest/autorun.php');
require_once('APITestCase.php');

class GetDesignsTestCase extends APITestCase {

  function __construct($name = false) {
    parent::__construct($name);
  }
  function setUp() {
    parent::setUp();
    // The parent setup creates a test design for us, but it also adds 
    // a thumbnail which is not what we want, so remove it
    unlink($this->testDesignFolder . 'preview/test.jpg');
  }

  function testGetDesigns() {
    $designs = $this->api->getDesigns();

    // Check result
    $this->assertTrue(!array_key_exists('error_key', $designs),
      'Got error getting designs: ' . @$designs['error_key']
      . ' (' . @$designs['error_detail'] . ')');

    // Check the number of results---should have at least one test design
    // (see APITestCase.php)
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

  function getTestDesign() {
    $designs = $this->api->getDesigns();

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
