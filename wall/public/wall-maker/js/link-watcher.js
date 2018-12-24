/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define(["backbone"], function(Backbone) {
  // Class to automatically handle clicks to all local links and turn them into
  // appropriate events
  return function(basePath) {

    // Normalize base path
    basePath = basePath.substr(-1) != '/'
             ? basePath + '/'
             : basePath;

    // Event dispatching
    _.extend(this, Backbone.Events);

    // Register with all links currently in the document
    var links = document.getElementsByTagName("a");
    for (i = 0; i < links.length; i++) {
      possiblyAddListener(links[i]);
    }

    // Watch for new links, or links whose href has changed
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        switch (mutation.type) {
          case 'childList':
            var links = [];
            [].slice.call(mutation.addedNodes).forEach(
              function (newNode) {
                if (newNode.nodeType != Node.ELEMENT_NODE)
                  return;
                // Look for links amongst the nodes descendants
                links =
                  links.concat(
                    [].slice.call(newNode.getElementsByTagName("a")));
                // Don't forget the node itself
                if (newNode.tagName == 'A')
                  links.push(newNode);
              }
            );
            links.forEach(possiblyAddListener);
            break;

          case 'attributes':
            possiblyAddListener(mutation.target);
            break;
        }
      });
    });
    observer.observe(document,
      { attributes: true,
        attributeFilter: [ 'href' ],
        childList: true,
        subtree: true }
    );

    // This pointer for helper methods
    var LinkWatcher = this;

    function handleLink(evt) {
      // Don't follow the link
      // (Doing this first means we won't change page even if there is an
      // unhandled exception in the code that follows)
      evt.preventDefault ? evt.preventDefault() : evt.returnValue = false;

      // Strip the base path
      var href = evt.currentTarget.pathname + evt.currentTarget.hash
      href = href.indexOf(basePath) == 0
           ? href.substr(basePath.length)
           : href;

      // Fire an event
      LinkWatcher.trigger("navigate", href);
    }

    function possiblyAddListener(elem) {
      if (elem.pathname.indexOf(basePath) == 0) {
        elem.addEventListener('click', handleLink, true);
      } else {
        elem.removeEventListener('click', handleLink, true);
      }
    }
  };
});
