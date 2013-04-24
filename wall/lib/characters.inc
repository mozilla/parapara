<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once("parapara.inc");
require_once("exceptions.inc");
require_once("UriUtils.inc");
require_once("walls.inc");

function addCharacter($wallId, $svg, $metadata) {
  // Get connection
  $conn =& getDbConnection();

  // Get active session
  $sessionId = getActiveSessionId($wallId);
  if(!$sessionId) {
    throw new KeyedException('no-active-session');
  }

  // Start transaction
  $trans = $conn->beginTransaction();
  if (PEAR::isError($trans)) {
    error_log($res->getMessage() . ', ' . $res->getDebugInfo());
    throw new KeyedException('db-error');
  }

  // Insert record
  $date = gmdate('Y-m-d H:i:s');
  // calculate X value
  $duration = getWallDuration($wallId);
  $currentWallTime = getCurrentWallTimeForDuration($duration);
  $x = floor($currentWallTime / $duration * 1000);
  
  $query =
    'INSERT INTO characters'
    . ' (sessionId, wallId, title, author, x, groundOffset, width, height,'
    . ' createDate,  active)'
    . ' VALUES '
    . '(' . $conn->quote($sessionId, 'integer')
    . ',' . $conn->quote($wallId, 'integer')
    . ',' . $conn->quote($metadata['title'], 'text')
    . ',' . $conn->quote($metadata['author'], 'text')
    . ',' . $conn->quote($x, 'integer')
    . ',' . $conn->quote($metadata['groundOffset'], 'decimal')
    . ',' . $conn->quote($metadata['width'], 'float')
    . ',' . $conn->quote($metadata['height'], 'float')
    . ',' . $conn->quote($date, 'timestamp')
    . ',TRUE' // active 
    . ')';
  $res =& $conn->query($query);
  if (PEAR::isError($res)) {
    error_log($res->getMessage() . ', ' . $res->getDebugInfo());
    throw new KeyedException('db-error');
  }

  // Get id
  $charId = $conn->lastInsertID('characters', 'charId');
  if (PEAR::isError($charId)) {
    $conn->rollback();
    error_log($res->getMessage() . ', ' . $res->getDebugInfo());
    throw new KeyedException('db-error');
  }

  // Save file
  $svgfilename = getFilenameForId($charId);
  $svgfile = @fopen($svgfilename, 'w');
  if ($svgfile == false) {
    $conn->rollback();
    throw new KeyedException('failed_to_write',
      'このファイルには書き込みできません');
  }
  fwrite($svgfile, $svg);
  fclose($svgfile);

  // Commit transaction
  $conn->commit();

  // Return id
  return $charId;
}

class Character {
  private $_charId  = null;
  private $metadata = null;

  static private $virtualFields =
    array('emailUrl', 'thumbnail');

  static private $readOnlyFields = array('charId');

  public function __construct($charId, $metadata) {
    $this->_charId  = $charId;
    $this->metadata = $metadata;
  }

  public function __get($name) {
    // Check if the field is set
    if (!isset($this->$name)) {
      return null;
    }

    // Regular metadata
    if (array_key_exists($name, $this->metadata)) {
      return $this->metadata[$name];
    }

    // Virtual fields
    switch ($name) {
      case 'charId':
        return $this->_charId;
    }

    return null;
  }

  public function __isset($name) {
    // Regular metadata
    if (array_key_exists($name, $this->metadata))
      return true;

    // Virtual fields
    switch ($name) {
      case 'charId':
        return true;
    }

    return false;
  }

  public function asArray() {
  }

  // Set: active
}

class Characters {
  public static function create($svg, $metadata, $wallId, $email = null) {
    // Get connection
    $conn =& getDbConnection();

    // Get wall
    $wall = Walls::getById($wallId, $email);
    if ($wall === null) {
      error_log("Wall $wallId not found when adding character");
      throw new KeyedException('not-found', 'Wall not found');
    }

    // Get latest session
    $session = $wall->latestSession;
    if ($session === null || $session['end'] !== null) {
      throw new KeyedException('no-active-session');
    }

    // Start transaction
    $trans = $conn->beginTransaction();
    checkDbResult($trans);

    // Prepare fields
    $date = gmdate('Y-m-d H:i:s');
    /*
    // calculate X value
    $duration = getWallDuration($wallId);
    $currentWallTime = getCurrentWallTimeForDuration($duration);
    $x = floor($currentWallTime / $duration * 1000);
     */
    $x = 0;

    // Insert record
    $query =
      'INSERT INTO characters'
      . ' (sessionId, wallId, title, author, x, groundOffset, width, height,'
      . '  createDate, active)'
      . ' VALUES '
      . '(' . $conn->quote($session['sessionId'], 'integer')
      . ',' . $conn->quote($wallId, 'integer')
      . ',' . $conn->quote($metadata['title'], 'text')
      . ',' . $conn->quote($metadata['author'], 'text')
      . ',' . $conn->quote($x, 'integer')
      . ',' . $conn->quote($metadata['groundOffset'], 'decimal')
      . ',' . $conn->quote($metadata['width'], 'float')
      . ',' . $conn->quote($metadata['height'], 'float')
      . ',' . $conn->quote($date, 'timestamp')
      . ',TRUE' // active 
      . ')';
    $res =& $conn->query($query);
    checkDbResult($res);

    // Get id
    $charId = $conn->lastInsertID('characters', 'charId');
    checkDbResult($charId);

    // XXX Save file

    // Commit transaction
    $conn->commit();

    // Return char
    return self::getById($charId, $email);
  }

  public static function getById($charId, $email = null) {
    // Prepare parameters
    $charId = intval($charId);
    if ($charId < 1)
      throw new KeyedException('bad-request');

    // Run query
    $conn =& getDbConnection();
    $row =& $conn->queryRow(
        'SELECT characters.* FROM characters'
      . ' WHERE characters.charId = ' . $conn->quote($charId, 'integer')
      . ' LIMIT 1',
      null,
      MDB2_FETCHMODE_ASSOC
    );
    $conn->disconnect();
    checkDbResult($row);

    // Check if character was found
    if ($row === null)
      return null;

    // Load information into array
    $metadata = array();
    $mapping = array('sessionid' => 'sessionId',
                     'wallid' => 'wallId',
                     'title',
                     'author',
                     'x',
                     'groundoffset' => 'groundOffset',
                     'width' => 'height',
                     'createdate' => 'createDate',
                     'active' => 'active');
    foreach ($mapping as $dbKey => $mdKey) {
      $dbKey = is_int($dbKey) ? $mdKey : $dbKey;
      if (!isset($row[$dbKey])) {
        error_log("Failed to find field '$dbKey' when loading character");
        throw new KeyedException('db-error');
      }
      $metadata[$mdKey] = $row[$dbKey];
    }

    // Process values that need special handling
    $metadata['active'] = !!($metadata['active']);

    return new Character($charId, $metadata);
  }

  public static function getBySession($sessionId) {
  }

  public static function getByWall($wallId) {
  }

  public static function deleteById($charId) {
  }

  public static function deleteBySession($sessionId) {
  }

  public static function deleteByWall($wallId) {
  }
}

?>
