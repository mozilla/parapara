/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var ParaPara = ParaPara || {};

// --------------------- Feedback Controls ------------------------
//debug: https://hacks.mozilla.org/2012/08/remote-debugging-on-firefox-for-android/
ParaPara.FeedbackControls = function(soundfilename) {
  var self = this;
  var xhr = new XMLHttpRequest();
  xhr.open("GET", soundfilename, true);
  xhr.responseType = "arraybuffer";
  xhr.onload = function() {
    var audioContext = window.AudioContext ? new window.AudioContext() : new window.webkitAudioContext();
    audioContext.decodeAudioData(xhr.response, function onSuccess(result) {
      self.playAudio(audioContext, result);
    });
  };
  xhr.send();
}

ParaPara.FeedbackControls.prototype.playAudio = function(audioContext, audioBuffer) {
  var source = audioContext.createBufferSource();
  var gainControl = audioContext.createGain();
  source.connect(gainControl);
  gainControl.connect(audioContext.destination);
  source.buffer = audioBuffer;
  source.loop = true;
  gainControl.gain.value = 0;
  source.start(0);
  this.gainControl = gainControl;
  this.audioContext = audioContext;
}

ParaPara.FeedbackControls.prototype.start = function(x, y) {
  this.gainControl.gain.value = 1;
//  this.gainControl.gain.setValueAtTime(1, 0);

//  this.previous_x = x;
//  this.previous_y = y;
//  this.previous_time = this.context.currentTime;
//  source.playbackRate.value = 1;
}

ParaPara.FeedbackControls.prototype.update = function(x, y) {
  //changes playbackRate
  /*
  var scalar = Math.sqrt(Math.pow(x - this.previous_x, 2) + Math.pow(y - this.previous_y, 2));
  var accelaration = scalar / (this.context.currentTime - this.previous_time);
  this.previous_x = x;
  this.previous_y = y;
  this.previous_time = this.context.currentTime;
  var playbackRate = Math.log(accelaration)*0.3;
  //this.source.playbackRate.value = playbackRate;
  //console.log(accelaration+":"+playbackRate);
  */
  clearTimeout(this.timer);
  var self = this;
  this.timer = setTimeout(function() {
    self.gainControl.gain.value = 0;
    //self.gainControl.gain.setValueAtTime(0, 0);
  }, 50);
  self.gainControl.gain.value = 1;
//  self.gainControl.gain.setValueAtTime(1, 0);
}

ParaPara.FeedbackControls.prototype.stop = function() {
  this.gainControl.gain.value = 0;
//  this.gainControl.gain.setValueAtTime(0, 0);
}