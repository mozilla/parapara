<?php
/* We don't have an automated system for managing database updates like Rails 
 * yet so for now we just use these scripts we should be run from the 
 * command-line. */

ini_set('display_errors', '1');

require_once('../lib/php/parapara.inc');
require_once('db.inc');

/* 
 * 001: 2013-04-18
 *  - Migrate sessions over to having a wall-specific ID
 */
define("MIGRATE_ID", "1");

/*
 * Database connection.
 *
 * You'll often want to create a separate user for the migration purposes that 
 * has the extra privileges to drop indices etc.
 *
 * e.g.
 * CREATE USER 'parapara_migrate'@'localhost' IDENTIFIED BY '***';
 * GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER,
 *       CREATE TEMPORARY TABLES, LOCK TABLES ON parapara.*
 *       TO 'parapara_migrate'@'localhost';
 */
$dsn = array(
    'phptype'  => 'mysql',
    'username' => 'parapara_migrate',
    'database' => 'parapara',
    'hostspec' => '127.0.0.1'
  );

/*
 * Get database connection
 */
if (is_array($dsn) && !array_key_exists('password', $dsn)) {
  $prompt = "Password for `" . $dsn['username'] . "`: ";
  $dsn['password'] = _readline($prompt);
}

$conn =& MDB2::connect($dsn);
if (PEAR::isError($conn)) {
  die('Error connecting to DB: ' . $conn->getMessage()
      . ', ' . $conn->getDebugInfo());
}
echo "Connected to database\n";

/*
 * Get ready for some managing
 */
$conn->loadModule('Manager');

/*
 * Fix buggy handling of index naming in MySQL
 */
$conn->options['idxname_format'] = '%s';

/*
 * Do backup
 */
if (is_array($dsn) && $dsn['phptype'] == 'mysql') {
  $backup_file =
    'parapara_migrate_' . str_pad(MIGRATE_ID, 3, '0', STR_PAD_LEFT)
    . gmdate('_Ymd_His') . '.sql';
  echo "Backing up to $backup_file\n";
  exec("mysqldump -h " . $dsn['hostspec'] . " -u " . $dsn['username']
       . " --password=" . $dsn['password'] . " " . $dsn['database']
       . " > $backup_file");
}

/* Drop reference from characters to session ID */
$constraints = $conn->listTableConstraints('characters');
if (in_array('characters_ibfk_1', $constraints)) {
  ensureOk($conn->dropConstraint('characters', 'characters_ibfk_1'));
}

function ensureOk($res) {
  global $conn;
  if (PEAR::isError($res)) {
    die($res->getMessage() . ", " . $res->getDebugInfo());
  }
}

function _readline($prompt) {
  if (PHP_OS == 'WINNT') {
    echo $prompt;
    return stream_get_line(STDIN, 1024, PHP_EOL);
  } else {
    return readline($prompt);
  }
}

?>
