<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// Very simplistic template management
function compileTemplate($file, $vars)
{
  $file = TEMPLATE_DIR . $file;
  // Check file exists and is readable
  if (!is_readable($file) || !is_file($file))
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

  return array('subject' => trim($matches[1]),
               'body'    => $parts[1]);
}

?>
