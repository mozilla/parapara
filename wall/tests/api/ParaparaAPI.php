<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../lib/parapara.inc');
require_once('MDB2.php');

/*
 * A controller that provides a simple interface for performing actions on the 
 * the Parapara system as a whole.
 *
 * It uses the API where possible. When no API is available it accesses the 
 * database directly.
 */
class ParaparaAPI {
  protected $db = null;

  function __construct($db) {
    $this->db = $db;
    $this->designsPath = dirname(__FILE__) . '/../../public/designs/';
  }

  /*
   * Utility method that removes everything created through this class.
   *
   * This is provided so that test code can easily clean up after each test run.
   */
  function cleanUp() {
    while (count($this->createdDesigns)) {
      $this->removeDesignByName($this->createdDesigns[0]);
    }
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
    $ch = curl_init($url);

    curl_setopt($ch, CURLOPT_HEADER, false);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_BINARYTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPGET, true);

    $data = curl_exec($ch);
    $info = curl_getinfo($ch);
    curl_close($ch);

    if (empty($info['http_code']) || $info['http_code'] !== 200) {
      return array(
        'error_key' => 'server-error',
        'error_detail' => 'Unexpected HTTP code: ' . @$info['http_code']);
    }

    if (empty($info['content_type']) ||
        $info['content_type'] !== 'application/json; charset=UTF-8') {
      return array(
        'error_key' => 'server-error',
        'error_detail' => 'Unexpected content-type: ' . @$info['content_type']);
    }

    $response = json_decode($data,true);
    if ($response === null) {
      return array(
        'error_key' => 'server-error',
        'error_detail' => "Failed to parse response: $response");
    }

    return $response;
  }
}

?>
