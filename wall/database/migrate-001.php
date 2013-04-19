<?php
/* We don't have an automated system for managing database updates like Rails 
 * yet so for now we just use these scripts we should be run from the 
 * command-line. */

ini_set('display_errors', '1');

require_once('../lib/parapara.inc');
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
$indices = $conn->listTableIndexes('characters');
if (in_array('sessionid', $indices)) {
  ensureOk($conn->dropIndex('characters', 'sessionId'));
}

/* Rename sessionId to sessionSerial */
$fields = $conn->listTableFields('sessions');
if (!in_array('sessionserial', $fields)) {
  ensureOk($conn->exec("ALTER TABLE sessions"
    . " CHANGE sessionId sessionSerial int(11) unsigned NOT NULL"
    . " AUTO_INCREMENT COMMENT 'The unique serial number of this session'"));
}

/* Create sessionId */
$fields = $conn->listTableFields('sessions');
if (!in_array('sessionid', $fields)) {
  ensureOk($conn->exec("ALTER TABLE sessions"
    . " ADD sessionId int(11) unsigned DEFAULT NULL"
    . " COMMENT 'The public-facing wall-specific ID' AFTER wallId"));
}

/* Fill in sessionId */
$res =& $conn->query(
  "SELECT wallId, GROUP_CONCAT(sessionSerial) as sessions,"
  . " MAX(sessionId) as maxid"
  . " FROM sessions GROUP BY wallId");
ensureOk($res);
$conn->setFetchMode(MDB2_FETCHMODE_ASSOC);
while ($row = $res->fetchRow()) {
  if ($row['maxid'])
    continue;
  $sessions = explode(',', $row['sessions']);
  $sessionId = 0;
  foreach($sessions as $session) {
    $sessionId += 1;
    $query = "UPDATE sessions SET sessionId = $sessionId"
      . " WHERE sessionSerial = $session";
    $update =& $conn->exec($query);
    ensureOk($update);
  }
}

/* Add non-null constraint on sessionId */
ensureOk($conn->exec("ALTER TABLE sessions"
  . " MODIFY sessionId int(11) unsigned NOT NULL"
  . " COMMENT 'The public-facing wall-specific ID'"));

/* Add wallId to characters */
$fields = $conn->listTableFields('characters');
if (!in_array('wallid', $fields)) {
  ensureOk($conn->exec("ALTER TABLE characters"
    . " ADD wallId int(11) unsigned AFTER charId"));
}

/* Fill in wallId and sessionId in characters */
$maxWallId =& $conn->queryOne('SELECT MAX(wallId) FROM characters');
if (!$maxWallId) {
  ensureOk($conn->exec("UPDATE characters, sessions"
    . " SET characters.wallId = sessions.wallId,"
    . " characters.sessionId = sessions.sessionId"
    . " WHERE characters.sessionId = sessions.sessionSerial"));
}

/* Add non-null constraint on characters.wallId */
ensureOk($conn->exec("ALTER TABLE characters"
  . " MODIFY wallId int(11) unsigned NOT NULL"));

/* Add index to sessions */
if (!in_array('wallsession', $conn->listTableIndexes('sessions'))) {
  ensureOk($conn->exec("CREATE INDEX wallSession ON sessions"
    . " (wallId, sessionId)"));
}

/* Add foreign key constraint from characters -> sessions */
$constraints = $conn->listTableConstraints('characters');
if (!in_array('fk_wallsession', $conn->listTableConstraints('characters'))) {
  ensureOk($conn->exec("ALTER TABLE characters"
    . " ADD CONSTRAINT fk_wallSession FOREIGN KEY (wallId, sessionId)"
    . " REFERENCES sessions (wallId, sessionId)"));
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
