<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once(dirname(__FILE__) . '/../../lib/parapara.inc');
require_once('walls.inc');
require_once('characters.inc');
require_once('MDB2.php');

/*
 * A controller that provides a simple interface for performing actions on the 
 * the Parapara system as a whole.
 *
 * It uses the API where possible. When no API is available it accesses the 
 * database directly.
 */
class ParaparaAPI {
  const DEFAULT_USER_EMAIL = 'test@test.org';

  static private $updatedSessionSettings = false;

  protected $db = null;

  function __construct($db) {
    $this->db = $db;
    $this->designsPath = dirname(__FILE__) . '/../../public/designs/';

    if (!self::$updatedSessionSettings) {
      // Don't let session_start use cookies since otherwise we'll get errors 
      // about headers already being sent
      ini_set("session.use_cookies",0);
    }
  }

  /*
   * Utility method that removes everything created through this class.
   *
   * This is provided so that test code can easily clean up after each test run.
   */
  function cleanUp() {
    // Characters
    while (count($this->createdCharacters)) {
      $this->removeCharacter($this->createdCharacters[0]);
    }
    // Walls
    while (count($this->createdWalls)) {
      $this->removeWall($this->createdWalls[0]);
    }
    // Designs
    while (count($this->createdDesigns)) {
      $this->removeDesignByName($this->createdDesigns[0]);
    }
    // Logout
    if ($this->sessionId) {
      $this->logout();
    }
  }

  /* ----------------------------------------------------------------------
   *
   * Login / sessions
   *
   * ---------------------------------------------------------------------*/

  public $userEmail = null;
  protected $sessionId = null;

  function login($email = null) {
    session_name(WALLMAKER_SESSION_NAME);
    session_cache_limiter(''); // Prevent warnings about not being able to send 
                               // cache limiting headers
    session_start();

    // Set email
    $email = $email ? $email : self::DEFAULT_USER_EMAIL;
    $_SESSION['email'] = $email;
    $this->userEmail   = $email;

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
    $this->userEmail = null;
  }

  /* ----------------------------------------------------------------------
   *
   * Wall handling
   *
   * ---------------------------------------------------------------------*/

  protected $createdWalls = array();

  function createWall($name, $designId) {
    // Prepare payload
    $payload['name']   = $name;
    $payload['design'] = $designId;

    // Make request
    global $config;
    $url = $config['test']['wall_server'] . 'api/walls';
    $wall = $this->postJson($url, $payload);

    // Track wall so we can clean it up
    if (is_array($wall) && !array_key_exists('error_key', $wall) &&
        array_key_exists('wallId', $wall)) {
      array_push($this->createdWalls, $wall['wallId']);
    }

    return $wall;
  }

  function removeWall($wallId) {
    // XXX When we have an API for this, allow providing a wall path as 
    // a parameter too

    // Remove connected sessions
    $query = 'DELETE FROM sessions WHERE wallId = ' . $wallId;
    $res =& $this->db->query($query);
    if (PEAR::isError($res)) {
      die($res->getMessage() . ', ' . $res->getDebugInfo());
    }

    // Remove wall
    $query = 'DELETE FROM walls WHERE wallId = ' . $wallId;
    $res =& $this->db->query($query);
    if (PEAR::isError($res)) {
      die($res->getMessage() . ', ' . $res->getDebugInfo());
    }

    // Remove from list of createdWalls
    while (($pos = array_search($wallId, $this->createdWalls)) !== FALSE) {
      array_splice($this->createdWalls, $pos, 1);
    }
  }

  function getWalls() {
    global $config;
    $url = $config['test']['wall_server'] . 'api/walls';
    return $this->getJson($url);
  }

  function getWall($wallIdOrPath) {
    global $config;
    $url = $config['test']['wall_server'] . 'api/walls/'
         . (is_int($wallIdOrPath) ? $wallIdOrPath : "byname/$wallIdOrPath");
    return $this->getJson($url);
  }

  function updateWall($wallIdOrPath, $payload) {
    global $config;
    $url = $config['test']['wall_server'] . 'api/walls/'
         . (is_int($wallIdOrPath) ? $wallIdOrPath : "byname/$wallIdOrPath");
    return $this->putJson($url, $payload);
  }

  /* ----------------------------------------------------------------------
   *
   * Wall session handling
   *
   * ---------------------------------------------------------------------*/

  function startSession($wallId, $sessionId) {
    // Prepare payload
    $payload['sessionId'] = $sessionId;

    // Make request
    global $config;
    $url = $config['test']['wall_server'] . "api/walls/$wallId/sessions";
    return $this->postJson($url, $payload);
  }

  function endSession($wallId, $sessionId) {
    // Make request
    global $config;
    $url = $config['test']['wall_server'] .
      "api/walls/$wallId/sessions/$sessionId";
    return $this->putJson($url, null);
  }

  function getSessions($wallId) {
    // Make request
    global $config;
    $url = $config['test']['wall_server'] . "api/walls/$wallId/sessions";
    return $this->getJson($url);
  }

  /* ----------------------------------------------------------------------
   *
   * Character handling
   *
   * ---------------------------------------------------------------------*/

  // Characters created here that have not yet been removed
  protected $createdCharacters = array();

  static protected $testCharacterFields =
    array(
      'title' => 'Test title',
      'author' => 'Test author',
      'groundOffset' => 0.1,
      'width' => 123.0,
      'height' => 456.0);
  static protected $testSvg = '<svg><circle cx="50" cy="50" r="100"></svg>';

  function createCharacter($wallIdOrPath, $fields = null, $svg = null) {
    // Prepare payload
    $payload['metadata'] = self::$testCharacterFields;
    $payload['metadata'] = $fields
                         ? array_merge(self::$testCharacterFields, $fields)
                         : self::$testCharacterFields;
    $payload['svg']      = $svg ? $svg : self::$testSvg;

    // Make request
    global $config;
    $url = $config['test']['wall_server'] . 'api/walls/'
         . (is_int($wallIdOrPath) ? $wallIdOrPath : "byname/$wallIdOrPath")
         . '/characters';
    $char = $this->postJson($url, $payload);

    // Track character so we can clean it up
    if (is_array($char) && !array_key_exists('error_key', $char) &&
        array_key_exists('charId', $char)) {
      array_push($this->createdCharacters, $char['charId']);
    }

    return $char;
  }

  function removeCharacter($charId) {
    // XXX Switch over to using API when it is done
    Characters::deleteById($charId);

    // Remove from list of createdCharacters
    while (($pos = array_search($charId, $this->createdCharacters)) !== FALSE) {
      array_splice($this->createdCharacters, $pos, 1);
    }
  }
  
  // Unlike other methods in this class in this case we take the URL as 
  // a parameter. This is because the create character action returns an email 
  // URL (so the editor is a little less coupled to the backend) and we want to 
  // test that the returned URL is actually correct.
  function emailCharacterByUrl($url, $fields) {
    return $this->postJson($url, $fields);
  }

  function getCharactersBySession($wallId, $sessionId) {
    global $config;
    $url = $config['test']['wall_server'] . 'api/walls/' . $wallId
         . '/sessions/' . $sessionId . '/characters';
    return $this->getJson($url);
  }

  function getCharactersByWall($wallId) {
    global $config;
    $url = $config['test']['wall_server'] . 'api/walls/' . $wallId
         . '/characters';
    return $this->getJson($url);
  }

  /* ----------------------------------------------------------------------
   *
   * Design handling
   *
   * ---------------------------------------------------------------------*/

  // Path to designs folder
  protected $designsPath;

  // Designs created here that have not yet been removed
  protected $createdDesigns = array();

  function addDesign($name, $previewFilesToAdd = array()) {
    // Add to DB
    $query =
      'INSERT INTO designs'
      . ' (name, duration)'
      . ' VALUES ('. $this->db->quote($name, 'text') . ', 3000)';
    $res =& $this->db->query($query);
    if (PEAR::isError($res)) {
      die($res->getMessage() . ', ' . $res->getDebugInfo());
    }

    // Store ID
    $designId = $this->db->lastInsertID('designs', 'designId');
    if (PEAR::isError($designId)) {
      die($res->getMessage() . ', ' . $res->getDebugInfo());
    }

    // Add path for preview files
    if (!file_exists($this->designsPath . $name)) {
      if (!mkdir($this->designsPath . $name)) {
        die("Couldn't create design folder");
      }
    }
    if (!file_exists($this->designsPath . $name . "/preview")) {
      if (!mkdir($this->designsPath . $name . "/preview")) {
        die("Couldn't create preview folder");
      }
    }
    $designFolder = $this->designsPath . $name . "/";

    // Add preview files
    if (is_array($previewFilesToAdd) && count($previewFilesToAdd)) {
      foreach($previewFilesToAdd as $filename) {
        $file = $designFolder . 'preview/' . $filename;
        $handle = fopen($file, 'w');
        fclose($handle);
      }
    }

    // Record the design so we can automatically remove it if necessary
    array_push($this->createdDesigns, $name);

    return array($designId, $designFolder);
  }

  function removeDesignByName($name) {
    // Remove from db
    $res =&
      $this->db->query('DELETE FROM designs WHERE name = '
        . $this->db->quote($name, 'text'));
    if (PEAR::isError($res)) {
      die($res->getMessage() . ', ' . $res->getDebugInfo());
    }

    // Remove preview files
    $designFolder = $this->designsPath . $name . "/";
    $previewFolder = $designFolder . 'preview';
    if (file_exists($previewFolder)) {
      foreach (glob($previewFolder . '/*.*') as $filename) {
        unlink($filename);
      }
      if (!rmdir($previewFolder)) {
        die("Couldn't remove preview folder: $previewFolder");
      }
    }
    // Remove design folder
    if (file_exists($designFolder)) {
      if (!rmdir($designFolder)) {
        die("Couldn't remove design folder: $designFolder");
      }
    }

    // Remove from list of createdDesigns
    while (($pos = array_search($name, $this->createdDesigns)) !== FALSE) {
      array_splice($this->createdDesigns, $pos, 1);
    }
  }

  function getDesigns() {
    // Make request
    global $config;
    $url = $config['test']['wall_server'] . 'api/designs';
    return $this->getJson($url);
  }

  /* ----------------------------------------------------------------------
   *
   * Request handling
   *
   * ---------------------------------------------------------------------*/

  protected function getJson($url) {
    return $this->makeJsonRequest($url, "GET");
  }

  protected function postJson($url, $parameters) {
    return $this->makeJsonRequest($url, "POST", $parameters);
  }

  protected function putJson($url, $parameters) {
    return $this->makeJsonRequest($url, "PUT", $parameters);
  }

  protected function makeJsonRequest($url, $method, $parameters = null) {
    $payload     = null;
    $contentType = null;

    // Prepare payload
    if ($parameters !== null) {
      $payload = json_encode($parameters);
      $contentType = "application/json";
    }

    // Make request
    list($data, $httpCode, $contentType) =
      $this->makeRequest($url, $method, $payload, $contentType);

    // Check response
    if ($httpCode !== 200) {
      return array(
        'error_key' => 'server-error',
        'error_detail' => 'Unexpected HTTP code: ' . @$info['http_code']);
    }
    if ($contentType !== 'application/json; charset=UTF-8') {
      return array(
        'error_key' => 'server-error',
        'error_detail' => 'Unexpected content-type: ' . @$info['content_type']);
    }

    // Decode
    $response = json_decode($data, true);
    if ($response === null) {
      return array(
        'error_key' => 'server-error',
        'error_detail' => "Failed to parse response: $response");
    }
    return $response;
  }

  // Requests a URL using the specified method and payload
  //
  // Returns a triple: (data, http response code, response content type)
  protected function makeRequest($url, $method,
                                 $payload = null,
                                 $payloadContentType = null) {
    // Initialize request
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_HEADER, false);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_BINARYTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

    // Set up parameters if any
    if ($payload) {
      if ($payloadContentType) {
        curl_setopt($ch, CURLOPT_HTTPHEADER,
          array('Content-type: ' . $payloadContentType));
      }
      $fh = fopen('php://temp', 'rw');
      fwrite($fh, $payload);
      rewind($fh);
      curl_setopt($ch, CURLOPT_INFILE, $fh);
      curl_setopt($ch, CURLOPT_INFILESIZE, strlen($payload));
      curl_setopt($ch, CURLOPT_PUT, true);
    }

    // Set session cookie if logged in
    if ($this->sessionId) {
      curl_setopt($ch, CURLOPT_COOKIE,
        WALLMAKER_SESSION_NAME . "=" . $this->sessionId);
    }

    // Make request
    $data = curl_exec($ch);
    $info = curl_getinfo($ch);

    // Tidy up
    curl_close($ch);
    if (isset($fh))
      fclose($fh);

    // Return result
    return array($data, @$info['http_code'], @$info['content_type']);
  }
}

?>
