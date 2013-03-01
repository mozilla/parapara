<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../lib/parapara.inc');
require_once('simpletest/autorun.php');
require_once('ParaparaTestCase.php');

class GetDesignsTestCase extends ParaparaTestCase {

  protected $designsPath;
  protected $testFolder;

  function __construct() {
    parent::__construct();
    $this->designsPath = dirname(__FILE__) . '/../../public/designs/';
  }

  function setUp() {
    // Add a test row
    $query =
      'INSERT INTO designs'
      . ' (name, duration)'
      . ' VALUES ("test", 3000)';
    $res =& $this->getConnection()->query($query);
    if (PEAR::isError($res)) {
      die($res->getMessage() . ', ' . $res->getDebugInfo());
    }
    // Add folder for files
    if (!file_exists($this->designsPath . "test")) {
      if (!mkdir($this->designsPath . "test")) {
        die("Couldn't create test folder");
      }
    }
    if (!file_exists($this->designsPath . "test/preview")) {
      if (!mkdir($this->designsPath . "test/preview")) {
        die("Couldn't create preview folder");
      }
    }
    $this->testFolder = $this->designsPath . "test/preview/";
  }

  function tearDown() {
    // Remove test row
    $res =&
      $this->getConnection()->query('DELETE FROM designs WHERE name = "test"');
    if (PEAR::isError($res)) {
      die($res->getMessage() . ', ' . $res->getDebugInfo());
    }
    // Clean up test files
    $this->cleanUpFiles();
  }

  function cleanUpFiles() {
    // Remove test/preview
    if (file_exists($this->testFolder)) {
      foreach (glob($this->testFolder . '*.*') as $filename) {
        unlink($filename);
      }
      if (!rmdir($this->testFolder)) {
        die("Couldn't remove preview folder");
      }
    }
    // Remove test
    if (file_exists($this->designsPath . "test")) {
      if (!rmdir($this->designsPath . "test")) {
        die("Couldn't remove test folder");
      }
    }
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

  function testTestDesign() {
    $testDesign = $this->getTestDesign();

    // Check duration
    $this->assertTrue($testDesign['duration'] == 3000,
      "Unexpected duration: " . $testDesign['duration']);
  }

  function testSvg() {
    $design = $this->getTestDesign();

    // No svg entry should exist yet
    $this->assertTrue(!array_key_exists('svg', $design),
                      "Unexpected svg entry in design");

    // Add an SVG file
    $this->createMediaFile('test.svg');

    // Fetch again
    $design = $this->getTestDesign();
    $this->assertTrue(array_key_exists('svg', $design),
                      "SVG entry should exist");
    $this->assertTrue($design['svg'] == '/designs/test/preview/test.svg',
                      "Unexpected SVG file: " . $design['svg']);
  }

  function testThumbnail() {
    $design = $this->getTestDesign();

    // No thumbnail entry should exist yet
    $this->assertTrue(!array_key_exists('thumbnail', $design),
                      "Unexpected thumbnail entry in design");

    // Add a JPG file
    $this->createMediaFile('test.jpg');
    $this->checkForThumbnail('jpg');

    // Add a PNG file (should win)
    $this->createMediaFile('test.png');
    $this->checkForThumbnail('png');

    // Remove PNG and JPG should be back
    unlink($this->testFolder . 'test.png');
    $this->checkForThumbnail('jpg');

    // Add GIF (JPG should win)
    $this->createMediaFile('test.gif');
    $this->checkForThumbnail('jpg');

    // Remove JPG
    unlink($this->testFolder . 'test.jpg');
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
    $this->createMediaFile('test.mp4');
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
    $this->createMediaFile('test.webm');
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
    $url = $config['test']['wall_server'] . 'designs';
    $response = $this->get($url);

    // Check response
    $this->assertResponse(200);
    $this->assertMime('text/plain; charset=UTF-8');

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

  function createMediaFile($filename) {
    $file = $this->testFolder . $filename;
    $handle = fopen($file, 'w');
    fclose($handle);
  }
}

?>
