<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once(dirname(__FILE__) . '/../lib/parapara.inc');
require_once(dirname(__FILE__) . '/api/ParaparaAPI.php');
require_once('simpletest/autorun.php');
require_once('MDB2.php');

/*
 * An abstract base class for all Parapara tests.
 *
 * This base class wraps up direct access to the database.
 */
abstract class ParaparaTestCase extends UnitTestCase {

  protected $dateRegEx = '/^2\d{3}-[01]\d-[0-3]\d [0-2]\d:[0-5]\d:[0-5]\d$/';

  function __construct($name = false) {
    parent::__construct($name);
    if (self::$conn === null) {
      self::initDb();
    }
  }

  /* ----------------------------------------------------------------------
   *
   * Database handling
   *
   * ---------------------------------------------------------------------*/

  // Database connection singleton
  static private $conn = null;

  private static function initDb() {
    global $config;

    // Connect to database as privileged user
    $conn =& MDB2::factory($config['db']['test_dsn']);
    if (PEAR::isError($conn)) {
      error_log('Error connecting to DB: ' . $conn->getMessage()
                 . ', ' . $conn->getDebugInfo());
      die("Couldn't connect to database: " . $conn->getMessage());
    }

    // Get statements to execute
    $statements =
      self::getSqlStatements(dirname(__FILE__) . '/../database/create.sql');
    if (!$statements) {
      die("Couldn't get SQL statements to init database");
    }

    // Run statements
    foreach ($statements as $statement) {
        $res = $conn->exec($statement);
        if (PEAR::isError($res)) {
            die($res->getMessage() . " [executing: $statement]");
        }
    }

    // Store connection so we don't do this again
    self::$conn = $conn;
  }

  protected static function getSqlStatements($file) {
    // Get file contents
    $contents = file_get_contents($file);
    if (!$contents) {
      error_log("Couldn't read SQL file: " . $file);
      return null;
    }

    // Do some massaging of the data

    // Remove comments
    // 
    // There are various kinds:
    //    # Comment
    //    -- Comment
    //    /* Comment */
    $comment_patterns = array('/\s*#.*\n/',
                              '/\s*--.*\n/',
                              '/\/\*.*?\*\//s');
    $contents = preg_replace($comment_patterns, "\n", $contents);

    // Split SQL statements
    $delim = ';';
    $statements = array();
    do {
      // Split up to DELIMITER using the current delimeter
      $matches = preg_split("/\bDELIMITER (\S+)\n/", $contents, 2,
                            PREG_SPLIT_NO_EMPTY | PREG_SPLIT_DELIM_CAPTURE);
      $statements =
        array_merge($statements,
          preg_split("/" . preg_quote($delim) . "\s?\n/",
                     $matches[0], NULL, PREG_SPLIT_NO_EMPTY));

      // If we have a DELIMETER then update accordingly
      if (count($matches) == 3) {
        $delim = $matches[1];
        $contents = $matches[2];
      } else {
        $contents = null;
      }
    } while ($contents);

    // Normalise whitestpace
    $statements = preg_replace("/\s/", ' ', $statements);

    // Remove empty statements
    $statements = 
      array_filter($statements, array('ParaparaTestCase', 'isNotEmpty'));

    return $statements;
  }

  public static function isNotEmpty($str) {
    return trim($str) != '';
  }

  public function getConnection() {
    return self::$conn;
  }

  /* ----------------------------------------------------------------------
   *
   * API member
   *
   * ---------------------------------------------------------------------*/

  protected $_api = null;

  public function __get($name) {
    if ($name === 'api') {
      if ($this->_api === null) {
        $this->_api = new ParaparaAPI($this->getConnection());
      }
      return $this->_api;
    }
  }

  /* ----------------------------------------------------------------------
   *
   * Extra assertions
   *
   * ---------------------------------------------------------------------*/

  function idLike ($thing) {
    return isset($thing) && is_int($thing) && $thing > 0;
  }

  function assertIdLike($candidate, $message = '%s') {
      $dumper = new SimpleDumper();
      $message = sprintf(
              $message,
              "[" .  $dumper->describeValue($candidate) .
                      "] doesn't look like an ID");
      return $this->assertTrue($this->idLike($candidate), $message);
  }
}

?>
