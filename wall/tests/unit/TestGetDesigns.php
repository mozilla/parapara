<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../lib/parapara.inc');
require_once('simpletest/autorun.php');
require_once('ParaparaTestCase.php');

class GetDesignsTestCase extends ParaparaTestCase {
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
  }

  function tearDown() {
    // Remove test row
    $res =&
      $this->getConnection()->query('DELETE FROM designs WHERE name = "test"');
    if (PEAR::isError($res)) {
      die($res->getMessage() . ', ' . $res->getDebugInfo());
    }
  }

  function testGetDesigns() {
    // Get designs
    $response = $this->getDesigns();
    $this->assertResponse(200);
    $this->assertMime('text/plain; charset=UTF-8');

    // Parse response
    $designs = json_decode($response,true);
    $this->assertTrue($designs !== null,
                      "Failed to decode response: $response");

    // Check the test row is present
    $this->assertTrue(count($designs) >= 1,
                      "Too few designs: " . count($designs));
    $found = false;
    foreach ($designs as $design) {
      $this->assertTrue(array_key_exists('name', $design),
          "No name key found in design: " . print_r($design, true));
      if ($design['name'] == 'test') {
        $found = true;
      }
    }
    $this->assertTrue($found, "Couldn't find test design");
  }

  function getDesigns() {
    global $config;
    $url = $config['test']['wall_server'] . 'wall-maker/api/designs';
    return $this->get($url);
  }
}

?>
