<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once("../../lib/parapara.inc");
require_once("db.inc");
require_once("UriUtils.inc");
require_once("PEAR/Mail.php");
require_once("template.inc");

header("Content-Type: text/plain; charset=UTF-8");

// Read JSON request
$handle = fopen('php://input','r');
$jsonString = fgets($handle);
$json = json_decode($jsonString,true);
fclose($handle);

// Validate ID
$id = $json["id"];
$connection = getConnection();
try {
  $query = "SELECT count(*) FROM characters WHERE id = $id";
  $result = mysql_query($query, $connection) or throwException(mysql_error());
  $row = mysql_fetch_array($result,MYSQL_NUM);
  $count = floor($row[0]);
  if ($count == 0) {
    print "{\"error_key\":\"anim_not_found\",\"error_detail\":\"".$id."\"}\n\n";
    return;
  }
} catch (Exception $e) {
  $message = $e->getMessage();
  print "{\"error_key\":\"db_error\",\"error_detail\":\"$message\"}\n\n";
  return;
}

// Validate address
$address = $json["address"];
// We'd like to use filter_var($address, FILTER_VALIDATE_EMAIL) here but I'm 
// pretty sure it doesn't support IDNs and idn_to_ascii operates on a domain 
// not an email address (and splitting out the domain, converting it, and 
// adding it back in appears to be non-trivial since @ symbols can be escaped).

// Get URL
$url = shortenUrl(getGalleryUrlForId($id));

// Make up email template
$template = compileEmailTemplate("email_anim.inc", array("url" => $url));
if (!$template) {
  print "{\"error_key\":\"template_failed\"}\n\n";
  return;
}
 
// Set up mail
$headers['From']    = "no-reply@mozilla-japan.org";
$headers['To']      = $address;
$headers['Subject'] = $template['subject'];
$mail_object =& Mail::factory("mail");
if (!$mail_object) {
  print "{\"error_key\":\"sending_failed\",\"error_detail\":\"$result\"}\n\n";
  return;
}

// Send
$result = $mail_object->send($address, $headers, $template['body']);
if (!$result) {
  print "{\"error_key\":\"sending_failed\",\"error_detail\":\"$result\"}\n\n";
  return;
}

print "{}"; // Success, empty response

?>
