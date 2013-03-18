<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../lib/parapara.inc');
require_once('MDB2.php');
require_once('WallTestCase.php');
require_once('walls.inc');

// SimpleTest seems to count the abstract WebTestCase as a test case
// See: http://sourceforge.net/tracker/?func=detail&aid=3473481&group_id=76550&atid=547455
SimpleTest::ignore('WebTestCase');

/*
 * Add abstract base class for tests related to the wall maker.
 *
 * Specifically, this base class:
 *
 *   - automatically creates a test user on setUp
 *   - automatically creates a test design on setUp
 *   - adds login/logout functions
 *   - provides wrappers for creating/removing walls
 */
abstract class WallMakerTestCase extends WallTestCase {

  static private $updatedSessionSettings = false;

  protected $sessionId        = null;
  protected $userId           = null;
  protected $userEmail        = null;

  function __construct($name = false) {
    parent::__construct($name);
    if (!self::$updatedSessionSettings) {
      // Don't let session_start use cookies since otherwise we'll get errors 
      // about headers already being sent
      ini_set("session.use_cookies",0);
    }
  }

  function setUp() {
    $this->sessionId = null;

    $this->userEmail = "test@test.org";
    $this->createTestDesign(array('test.jpg'));
  }

  function tearDown() {
    if ($this->sessionId) {
      $this->logout();
    }

    $this->userEmail = null;
    $this->removeTestDesign();
  }

  function login() {
    session_name(WALLMAKER_SESSION_NAME);
    session_cache_limiter(''); // Prevent warnings about not being able to send 
                               // cache limiting headers
    session_start();

    $_SESSION['email'] = 'test@test.org';

    // We're about to call into the wall server which will want to access the 
    // same session but session files are opened exclusively so we store the 
    // session ID in a variable and then close it.
    $this->sessionId = session_id();
    session_write_close();

    // Set the cookie
    $this->setCookie(WALLMAKER_SESSION_NAME, $this->sessionId);
  }

  function logout() {
    // Clear up the session on the server side
    session_name(WALLMAKER_SESSION_NAME);
    session_start();
    unset($_SESSION['email']);
    session_destroy();
    session_write_close();

    // Clear local state
    $this->sessionId = null;

    // When you create cookies without an expiry date they are treated as 
    // temporary cookies.
    // Restarting should clear them.
    $this->restart();
    $this->assertTrue(!$this->getCookie(WALLMAKER_SESSION_NAME),
        "Failed to clear cookie");
  }

  function _createWall($name, $designId) {
    // Prepare payload
    $payload['name']   = $name;
    $payload['design'] = $designId;

    // Make request
    global $config;
    $url = $config['test']['wall_server'] . 'api/walls';
    $response = $this->post($url, json_encode($payload));

    // Check response
    $this->assertResponse(200);
    $this->assertMime('text/plain; charset=UTF-8');

    // Parse response
    $wall = json_decode($response,true);
    $this->assertTrue($wall !== null,
                      "Failed to decode response: $response");

    return $wall;
  }

  function createWall($name, $designId) {
    $result = $this->_createWall($name, $designId);
    return $result['wallId'];
  }

  // XXX Replace this with a call to the appropriate API URL once the 
  // structure is in place
  function removeWall($wallId) {
    $conn =& $this->getConnection();
    $query = 'DELETE FROM sessions WHERE wallId = ' . $wallId;
    $res =& $conn->query($query);
    if (PEAR::isError($res)) {
      die($res->getMessage() . ', ' . $res->getDebugInfo());
    }

    $query = 'DELETE FROM walls WHERE wallId = ' . $wallId;
    $res =& $conn->query($query);
    if (PEAR::isError($res)) {
      die($res->getMessage() . ', ' . $res->getDebugInfo());
    }
  }
}

?>
