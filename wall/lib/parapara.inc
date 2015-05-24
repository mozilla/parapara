<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// Add this folder to the include path
set_include_path(implode(PATH_SEPARATOR, array(
    dirname(__FILE__),
    dirname(__FILE__).DIRECTORY_SEPARATOR."PEAR",
    get_include_path()
)));

require_once("config.inc");

$additional_config = getenv('PARAPARA_ADDITIONAL_CONFIG');
if ($additional_config) {
  require_once($additional_config);
}



?>
