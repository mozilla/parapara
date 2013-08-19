<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once("../lib/db.inc");
require_once("../lib/characters.inc");

// A very simply script to just iterate over all the characters and fill in 
// their short URLs.
//
// Useful when you change URL scheme or service (in which case you should 
// discard all the old short URLs first) or perhaps if the shortening service 
// was unavailable for some time.
//
// To run, just use php -f fillInShortUrls.php


$field = 'galleryUrlShort';
$conn =& getDbConnection();

// Get all characters
$res =& $conn->query('SELECT * FROM characters ORDER BY charId');
checkDbResult($res);

// Iterate
$conn->setFetchMode(MDB2_FETCHMODE_ASSOC);
while ($row = $res->fetchRow()) {
  print "Character " . $row['charid'] . "... ";

  // See if it already has a short URL
  // (Remove this to overwrite all short URLs)
  if ($row[strtolower($field)] !== null) {
    print "has URL, skipping.\n";
    continue;
  }

  // Get short URL
  $shortUrl = Character::getShortGalleryUrl($row['charid']);
  if (!$shortUrl) {
    print "couldn't get short URL, skipping.\n";
    continue;
  }

  // Update record
  print "saving short URL ($shortUrl)... ";
  $query = 'UPDATE characters SET '
         . ' galleryUrlShort = ' . $conn->quote($shortUrl, 'text')
         . ' WHERE charId = ' . $conn->quote($row['charid'], 'integer');
  $res =& $conn->exec($query);
  checkDbResult($res);
  print "saved.\n";
}

// Done
$conn->disconnect();
print "Done.\n";

?>
