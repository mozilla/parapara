/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var Utility = {
  applyDuration: function(timebaseElement, basetime, begintime) {
    var baseduration = Utility.toMilliseconds(Database.timebase.getAttribute("dur"));
    var durationRate = basetime/baseduration;
    Utility.applyDuration2Element(timebaseElement, durationRate, basetime, begintime);
    var animations = $("animateTransform");
    for (var i = 0, n = animations.length; i < n; i++) {
      var animation = animations[i];
      if (animation == timebaseElement) {
        continue;
      }
      Utility.applyDuration2Element(animation, durationRate, basetime, begintime);
    }
    return durationRate;
  },
  
  applyDuration2Element: function(element, durationRate, baseTime, beginTime) {
    var durationMilliseconds = Utility.toMilliseconds(element.getAttribute("dur"));
    if (durationMilliseconds) {
      var duration = Math.round(durationMilliseconds) * durationRate;
      element.setAttribute("dur", duration+"ms");
    }
    var beginAttribute = element.getAttribute("begin");
    var begin4delay = -beginTime;
//    var begin4delay = -Math.round(beginTime*(baseTime/durationMilliseconds));
    if (beginAttribute) {
      var beginMilliseconds = Utility.toMilliseconds(beginAttribute);
      if (beginMilliseconds) {
        var begin = Math.round(beginMilliseconds) * durationRate;
        element.setAttribute("begin", (begin+begin4delay)+"ms");
      }
    } else {
      element.setAttribute("begin", begin4delay+"ms");
    }
    var endAttribute = element.getAttribute("end");
    if (endAttribute) {
      var endMilliseconds = Utility.toMilliseconds(endAttribute);
      if (endMilliseconds) {
        var end = Math.round(endMilliseconds) * durationRate;
        element.setAttribute("end", end+"ms");
      }
    }
  },
  
  toMilliseconds: function(string) {
    var matches = string.match(/(\d+)(m?s)/);
    var value = parseInt(matches[1]);
    var unit = matches[2];
    return value * (unit == "s" ? 1000 : 1);
  }
}