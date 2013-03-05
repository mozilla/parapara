<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../lib/parapara.inc');
require_once('MDB2.php');
require_once('WallTestCase.php');

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

    $this->createTestUser();
    $this->createTestDesign(array('test.jpg'));
  }

  function tearDown() {
    if ($this->sessionId) {
      $this->logout();
    }

    $this->removeTestUser();
    $this->removeTestDesign();
  }

  private function createTestUser() {
    // Add a test user
    $query =
      'INSERT INTO users'
      . ' (email)'
      . ' VALUES ("test@test.org")';
    $res =& $this->getConnection()->query($query);
    if (PEAR::isError($res)) {
      die($res->getMessage() . ', ' . $res->getDebugInfo());
    }

    // Store the user ID and email
    $this->userId = $this->getConnection()->lastInsertID('users', 'userId');
    if (PEAR::isError($this->userId)) {
      die($res->getMessage() . ', ' . $res->getDebugInfo());
    }
    $this->userEmail = "test@test.org";
  }

  private function removeTestUser() {
    $res =&
      $this->getConnection()->query(
        'DELETE FROM users WHERE email = "test@test.org"');
    if (PEAR::isError($res)) {
      die($res->getMessage() . ', ' . $res->getDebugInfo());
    }
    $this->userId = null;
    $this->userEmail = null;
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

  // XXX Replace this with a call to the appropriate API URL once the 
  // structure is in place
  function createWall($params) {
    // Returns the wall ID
    return createWall($params);
  }

  // XXX Replace this with a call to the appropriate API URL once the 
  // structure is in place
  function removeWall($wallId) {
    $conn =& $this->getConnection();
    $query = 'DELETE FROM walls WHERE wallId = ' . $wallId;
    $res =& $conn->query($query);
    if (PEAR::isError($res)) {
      die($res->getMessage() . ', ' . $res->getDebugInfo());
    }
  }
}

?>
