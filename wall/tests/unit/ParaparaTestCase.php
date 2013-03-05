<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../lib/parapara.inc');
require_once('MDB2.php');
require_once('simpletest/web_tester.php');

// SimpleTest seems to count the abstract WebTestCase as a test case
// See: http://sourceforge.net/tracker/?func=detail&aid=3473481&group_id=76550&atid=547455
SimpleTest::ignore('WebTestCase');

/*
 * An abstract base class for all Parapara tests.
 *
 * This base class wraps up direct access to the database.
 */
abstract class ParaparaTestCase extends WebTestCase {

  // Database connection singleton
  static private $conn = null;

  // Path to designs folder
  protected $designsPath;

  function __construct($name = false) {
    parent::__construct($name);
    if (self::$conn === null) {
      self::initDb();
    }
    $this->designsPath = dirname(__FILE__) . '/../../public/designs/';
  }

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
    $statements = self::getSqlStatements('../../database/create.sql');
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
    $statements = preg_split("/;\s?\n/", $contents);

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
}

?>
