/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'underscore',
         'backbone',
         'views/base-view',
         'text!templates/design-selection.html' ],
function(_, Backbone, BaseView, template) {
  return BaseView.extend({
    events: {
      "change input[type=radio]": "radioChange"
    },
    render: function() {
      this.renderTemplate(template, { designs: this.collection.toJSON() });
      return this;
    },
    radioChange: function(evt, reset) {
      this.$("input[type=radio]").each(function(index, radio) {
        var selected = this.checked && !reset;

        // Set selected class on parent label
        var label = $(this).parent("label");
        if (!label)
          return;
        label.toggleClass("selected", selected);

        // Update play state of video
        var videos = label.find("video");
        if (videos.length) {
          if (selected) {
            videos[0].play();
          } else {
            videos[0].pause();
            try {
              videos[0].currentTime = 0;
            } catch (e) { /* Ignore bogus exceptions from WebKit */ }
          }
        }
      });
    }
  });
});
