<?php
function getConnection() {
  $connection =
    mysql_connect("127.0.0.1", DB_USER, DB_PASS) or die(mysql_error());
  mysql_select_db(DB_NAME, $connection) or die(mysql_error());
  return $connection;
}

function throwException($message = null,$code = null) {
  throw new Exception($message, $code);
}
?>
