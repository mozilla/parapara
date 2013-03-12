/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var ParaPara = ParaPara || {};

/*
 * Common utility functions
 */
var $ = function(id) { return document.getElementById(id); };

// Takes a date in the format we get from the API (yyyy-mm-dd hh:mm:ss) in UTC
// format, then:
//  - converts it to local time
//  - formats it according to current locale
//    XXX In future we need to tie this into our l10n selection
//        If you're using the Japanese version of the site in an English
//        browser, you should get Japanese date formatting.
ParaPara.toLocalDate = function(dateStr) {
  var numbers = dateStr.match(/(\d+)/g);
  if (numbers === null)
    return null;
  numbers = numbers.map(Number); // Convert to actual numbers
  return new Date(Date.UTC(numbers[0], numbers[1]-1,
                           numbers[2], numbers[3],
                           numbers[4], numbers[5])).toLocaleString();
}
