<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../lib/parapara.inc');
require_once('api.inc');
require_once('designs.inc');

header('Content-Type: text/plain; charset=UTF-8');

try {
  $designs = getDesignSummary();
} catch (KeyedException $e) {
  bailWithError($e->getKey(), $e->getDetail());
}

print json_encode($designs);

?>
