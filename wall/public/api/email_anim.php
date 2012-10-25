<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once("../../lib/parapara.inc");
require_once("api.inc");
require_once("db.inc");
require_once("UriUtils.inc");
require_once("template.inc");
require_once("Mail.php");

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: content-type');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS')
  exit;

header("Content-Type: text/plain; charset=UTF-8");

// Read JSON request
$handle = fopen('php://input','r');
$jsonString = fgets($handle);
$json = json_decode($jsonString,true);
fclose($handle);

// Validate ID and get metadata
$id = $json["id"];
if (!is_int($id) or $id < 0) {
  bailWithError('bad-id', 'Invalid ID');
}
$title  = "";
$author = "";
$conn =& getDbConnection();
$res =& $conn->query(
  'SELECT charId, title, author FROM characters WHERE charId = '
  . $conn->quote($id, 'integer')
);
if (PEAR::isError($res)) {
  error_log($res->getMessage() . ', ' . $res->getDebugInfo());
  bailWithError('db-error');
}
if ($res->numRows() != 1) {
  bailWithError('anim-not-found', $id);
}
$conn->setFetchMode(MDB2_FETCHMODE_ASSOC);
$row = $res->fetchRow();
$title  = $row['title'];
$author = $row['author'];
$conn->disconnect();

// Validate address
$address = trim($json["address"]);
if (!strlen($address)) {
  bailWithError('no-address', 'No email address supplied');
}
// We'd like to use filter_var($address, FILTER_VALIDATE_EMAIL) here but I'm 
// pretty sure it doesn't support IDNs and idn_to_ascii operates on a domain 
// not an email address (and splitting out the domain, converting it, and 
// adding it back in appears to be non-trivial since @ symbols can be escaped).

// Get URL
$url = shortenUrl(getGalleryUrlForId($id));

// Make up email template
$locale = trim(@$json["locale"]);
$templateFile = getTemplateFileForLocale($locale);
$template = compileEmailTemplate($templateFile,
  array("url" => $url, "author" => $author, "title" => $title));
if (!$template) {
  bailWithError('template-failed');
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
  error_log($mail_object->getMessage() . ', ' . $mail_object->getDebugInfo());
  bailWithError('sending-failed');
}

// Send mail
$send_result = $mail_object->send($address, $headers, $template['body']);
if (PEAR::isError($send_result)) {
  error_log($send_result->getMessage() . ', ' . $send_result->getDebugInfo());
  bailWithError('sending-failed');
}

print "{}"; // Success, empty response

function getTemplateFileForLocale($locale) {
  $reLangCode = "/^([[:alpha:]]{1,8})(-[[:alpha:]]{1,8})?$/";
  if ($locale && preg_match($reLangCode, $locale)) {
    $test = "email_anim." . $locale . ".inc";
    if (getTemplateFile($test))
      return $test;
  }
  return "email_anim.en-US.inc";
}

?>
