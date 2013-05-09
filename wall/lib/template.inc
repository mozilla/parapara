<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once("parapara.inc");

// Very simplistic template management
function compileTemplate($file, $vars)
{
  global $config;
  $file = getTemplateFile($file);
  if (!$file)
    return null;

  // Setup environment
  extract($vars);

  // Compile template
  ob_start();
  include $file;
  $result = ob_get_contents();
  ob_end_clean();

  return $result;
}

// Variation on compileTemplate that expects a template file where the first 
// line contains "Subject:" followed by the subject. The remainder is treated as
// the body.
// Returns an array with 'subject' and 'body' elements or null on failure.
function compileEmailTemplate($file, $vars)
{
  // Compile template
  $result = compileTemplate($file, $vars);
  if (!$result)
    return null;

  // Look for subject line and split it out
  $parts = preg_split('/\r\n|\r|\n/', $result, 2);
  $matches;
  if (!preg_match('/^\s*Subject:\s*(.*)$/i', $parts[0], $matches))
    return null;

  $subject = trim($matches[1]);
  // Normalize line breaks to CRLF
  $body = preg_replace("/((?<!\r)\n)|(\r(?!\n))/", "\r\n", $parts[1]);

  return array('subject' => $subject, 'body' => $body);
}

function getTemplateFile($file)
{
  global $config;
  $file = $config['templates']['path'] . $file;
  // Check file exists and is readable
  return is_readable($file) && is_file($file) ? $file : null;
}

// Looks for a file matching <templateName>.<locale>.inc.
// If it's not found, it tries <templateName>.en-US.inc
function getTemplateFileForLocale($templateName, $locale) {
  $reLangCode = "/^([[:alpha:]]{1,8})(-[[:alpha:]]{1,8})?$/";
  $candidates = array();
  if ($locale && preg_match($reLangCode, $locale)) {
    $candidates[] = $templateName . '.' . $locale . '.inc';
  }
  $candidates[] = $templateName . '.en-US.inc';
  foreach ($candidates as $candidate) {
    if (getTemplateFile($candidate))
      return $candidate;
  }
  return null;
}

?>
