/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const { classes: Cc, interfaces: Ci, results: Cr, utils: Cu } = Components;

Cu.import("resource://gre/modules/Services.jsm");

this.EXPORTED_SYMBOLS = ["Runtime"];

this.Runtime = function Runtime() {};

Runtime.prototype = {
  start: function(uri) {
    let features = [
      "chrome",
      "close",
      "dialog=no",
      "extrachrome",
      "resizable",
      "scrollbars",
      "width=1024",
      "height=740",
      "titlebar=no",
    ];

    let window = Services.ww.openWindow(null, appURI.spec, "_blank", features.join(","), null);

    window.addEventListener("mozContentEvent", function(event) {
      switch (event.detail.type) {
        case "shutdown-application":
          Services.startup.quit(Services.startup.eAttemptQuit);
          break;
        case "minimize-native-window":
          window.minimize();
        break;
        case "toggle-fullscreen-native-window":
          window.fullScreen = !window.fullScreen;
        break;
      }
    }, false);

  },
};
