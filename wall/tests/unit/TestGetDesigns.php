<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../lib/parapara.inc');
require_once('simpletest/autorun.php');
require_once('ParaparaTestCase.php');

class GetDesignsTestCase extends ParaparaTestCase {

  protected $mediaPath;

  function __construct() {
    parent::__construct();
    $this->mediaPath = dirname(__FILE__) . '/../../public/wall-maker/designs/';
  }

  function setUp() {
    // Add a test row
    $query =
      'INSERT INTO designs'
      . ' (name, mediaName, duration)'
      . ' VALUES ("test", "test-media", 3000)';
    $res =& $this->getConnection()->query($query);
    if (PEAR::isError($res)) {
      die($res->getMessage() . ', ' . $res->getDebugInfo());
    }

    $this->cleanUpFiles();
  }

  function tearDown() {
    // Remove test row
    $res =&
      $this->getConnection()->query('DELETE FROM designs WHERE name = "test"');
    if (PEAR::isError($res)) {
      die($res->getMessage() . ', ' . $res->getDebugInfo());
    }

    $this->cleanUpFiles();
  }

  function cleanUpFiles() {
    foreach (glob($this->mediaPath . 'test-media.*') as $filename) {
      unlink($filename);
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
    $this->createMediaFile('test-media.svg');

    // Fetch again
    $design = $this->getTestDesign();
    $this->assertTrue(array_key_exists('svg', $design),
                      "SVG entry should exist");
    $this->assertTrue($design['svg'] == 'designs/test-media.svg',
                      "Unexpected SVG file: " . $design['svg']);
  }

  function testThumbnail() {
    $design = $this->getTestDesign();

    // No thumbnail entry should exist yet
    $this->assertTrue(!array_key_exists('thumbnail', $design),
                      "Unexpected thumbnail entry in design");

    // Add a JPG file
    $this->createMediaFile('test-media.jpg');
    $this->checkForThumbnail('jpg');

    // Add a PNG file (should win)
    $this->createMediaFile('test-media.png');
    $this->checkForThumbnail('png');

    // Remove PNG and JPG should be back
    unlink($this->mediaPath . 'test-media.png');
    $this->checkForThumbnail('jpg');

    // Add GIF (JPG should win)
    $this->createMediaFile('test-media.gif');
    $this->checkForThumbnail('jpg');

    // Remove JPG
    unlink($this->mediaPath . 'test-media.jpg');
    $this->checkForThumbnail('gif');
  }

  function checkForThumbnail($extension) {
    $expected = "designs/test-media.$extension";
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
    $this->createMediaFile('test-media.mp4');
    $design = $this->getTestDesign();
    $this->assertTrue(array_key_exists('video', $design),
                      "Video entry should exist");
    $this->assertTrue(is_array($design['video']),
      "Video entry should be an array");
    $this->assertTrue(count($design['video']) === 1,
      "Should be only one video entry");
    $this->assertTrue($design['video'][0] == 'designs/test-media.mp4',
      "Unexpected video file: " . $design['video'][0]);

    // Add WebM
    $this->createMediaFile('test-media.webm');
    $design = $this->getTestDesign();
    $this->assertTrue(count($design['video']) === 2,
      "Should be two video entries");
    $this->assertTrue($design['video'][0] == 'designs/test-media.mp4',
      "Unexpected video file: " . $design['video'][0]);
    $this->assertTrue($design['video'][1] == 'designs/test-media.webm',
      "Unexpected video file: " . $design['video'][1]);
  }

  function getDesigns() {
    // Make request
    global $config;
    $url = $config['test']['wall_server'] . 'wall-maker/api/designs';
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
    $file = $this->mediaPath . $filename;
    $handle = fopen($file, 'w');
    fclose($handle);
  }
}

?>
