<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once("parapara.inc");
require_once("MDB2.php");

// When updating this, be sure to update wall.js as well
define("WALLMAKER_SESSION_NAME", "WMSESSID");

// Given a user id, returns an array of walls owned by that user with the 
// following information:
//
//   wallId
//   event name
//   design thumb URL
//   whether they will display in the gallery or not
//   creation date (UTC)
//   modification date (UTC)
//
// The results will be sorted by creation date such that recently created walls 
// sort before older walls.

function getWallSummaryForUser($email) {
  // Get connection
  global $config;
  $mdb2 =& MDB2::factory($config['db']['dsn']);
  if (PEAR::isError($mdb2)) {
    error_log('Error connecting to DB: ' . $mdb2->getMessage()
               . ', ' . $mdb2->getDebugInfo());
    return null;
  }

  // Run query
  $res =& $mdb2->query(
      'SELECT walls.wallId, walls.eventName, designs.thumbUrl,'
    . ' walls.galleryDisplay, walls.createDate, walls.modifyDate'
    . ' FROM users, walls'
    . ' LEFT JOIN designs on designs.designId = walls.designId'
    . ' WHERE users.email = '
    . $mdb2->quote($email, 'text')
    . '   AND walls.owner = users.userId'
    . ' ORDER BY walls.createDate DESC');
  if (PEAR::isError($res)) {
    error_log($res->getMessage() . ', ' . $res->getDebugInfo());
    return null;
  }

  // Process each array so we can tweak the values and make them a little less 
  // bound to the db schema
  $result = array();
  $mdb2->setFetchMode(MDB2_FETCHMODE_ASSOC);
  while ($row = $res->fetchRow()) {
    $result[] =
      array(
        'wallId' => $row['wallid'],
        'eventName' => $row['eventname'],
        'thumb' => $row['thumburl'],
        'galleryDisplay' => !!($row['gallerydisplay']),
        'createDate' => $row['createdate'],
        'modifyDate' => $row['modifydate']
      );
  }

  // Tidy up and finish
  $mdb2->disconnect();

  return $result;
}

?>
