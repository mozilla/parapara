/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'underscore', 'backbone' ],
function(_, Backbone) {
  return Backbone.Model.extend({
    // Backbone won't let us specify attributes on a delete request so we
    // add this behaviour ourselves:
    destroy: function(options) {
      if (typeof options['attrs'] !== "undefined") {
        options =
          _.extend(options,
            { contentType: 'application/json',
              data: JSON.stringify(options.attrs)
            });
      }
      return Backbone.Model.prototype.destroy.call(this, options);
    }
  });
});
