<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once("../../lib/parapara.inc");
require_once("db.inc");
require_once("UriUtils.inc");
require_once("template.inc");
require_once("Mail.php");

header("Content-Type: text/plain; charset=UTF-8");

// Read JSON request
$handle = fopen('php://input','r');
$jsonString = fgets($handle);
$json = json_decode($jsonString,true);
fclose($handle);

// Validate ID and get metadata
$id     = $json["id"];
$title  = "";
$author = "";
$connection = getConnection();
try {
  $query = "SELECT id, title, author FROM characters WHERE id = $id";
  $result = mysql_query($query, $connection) or throwException(mysql_error());
  $row = mysql_fetch_array($result, MYSQL_ASSOC);
  if (!$row) {
    print "{\"error_key\":\"anim_not_found\",\"error_detail\":\"".$id."\"}\n\n";
    return;
  }
  $title  = $row['title'];
  $author = $row['author'];
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
$template = compileEmailTemplate("email_anim.inc",
  array("url" => $url, "author" => $author, "title" => $title));
if (!$template) {
  print "{\"error_key\":\"template_failed\"}\n\n";
  return;
}

// Prepare mail
$headers['From']         = $config['mail']['from'];
$headers['To']           = $address;
$headers['Subject']      = $template['subject'];
$headers['Content-Type'] = "text/plain; charset=UTF-8";
$headers['Content-Transfer-Encoding'] = "8bit";

$mail_object =&
  Mail::factory($config['mail']['transport'], $config['mail']['params']);
if (PEAR::isError($mail_object)) {
  print "{\"error_key\":\"sending_failed\"," .
         "\"error_detail\":\"" . $mail_object->getMessage() . "\"}\n\n";
  return;
}

// Send mail
$send_result = $mail_object->send($address, $headers, $template['body']);
if (PEAR::isError($send_result)) {
  print "{\"error_key\":\"sending_failed\"," .
         "\"error_detail\":\"" . $send_result->getMessage() . "\"}\n\n";
  return;
}

print "{}"; // Success, empty response

?>
