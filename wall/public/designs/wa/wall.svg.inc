<!-- This Source Code Form is subject to the terms of the Mozilla Public
   - License, v. 2.0. If a copy of the MPL was not distributed with this file,
   - You can obtain one at http://mozilla.org/MPL/2.0/.  -->
<svg viewBox="0 0 1280 800"
   preserveAspectRatio="none"
     xmlns="http://www.w3.org/2000/svg" version="1.1"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     onload="Main.start();">

  <style type="text/css"><![CDATA[
    svg {background-color: white}
    .shadow {fill-opacity: 0.3; fill:black;}
  ]]></style>

  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur in="SourceAlpha" result="blur" stdDeviation="8"/>
    </filter>
  </defs>

  <image xlink:href="<?php echo $designPath ?>images/layer1.jpg"
    width="1524" height="279">
    <animateTransform attributeName="transform" type="translate"
      from="-1524 0" to="1524 0" repeatCount="indefinite"
      dur="120s"/>
  </image>

  <image xlink:href="<?php echo $designPath ?>images/layer2.jpg"
    width="1832" height="400">
    <animateTransform attributeName="transform" type="translate"
      from="-1832 350" to="1832 350" repeatCount="indefinite"
      dur="80s"/>
  </image>

  <g id="main-layer">
  </g>

  <image xlink:href="<?php echo $designPath ?>images/layer3.png"
    width="2048" height="800">
    <animateTransform attributeName="transform" type="translate"
      from="-2048 0" to="2048 0" repeatCount="indefinite"
      dur="60s"/>
  </image>

  <rect width="5" height="5" fill="blue">
    <animateTransform id="time-base" attributeName="transform" type="translate"
      from="0 0" to="1280 0" repeatCount="indefinite"
      dur="240s"/>
  </rect>

</svg>
