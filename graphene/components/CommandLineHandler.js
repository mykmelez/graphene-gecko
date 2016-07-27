/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- /
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { classes: Cc, interfaces: Ci, results: Cr, utils: Cu } = Components;

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

const windowWatcher = Cc['@mozilla.org/embedcomp/window-watcher;1'].
                      getService(Ci.nsIWindowWatcher);

const nsISupports              = Components.interfaces.nsISupports;

const nsIAppStartup            = Components.interfaces.nsIAppStartup;
const nsICommandLine           = Components.interfaces.nsICommandLine;
const nsICommandLineHandler    = Components.interfaces.nsICommandLineHandler;
const nsISupportsString        = Components.interfaces.nsISupportsString;
const nsIProperties            = Components.interfaces.nsIProperties;
const nsIFile                  = Components.interfaces.nsIFile;
const nsISimpleEnumerator      = Components.interfaces.nsISimpleEnumerator;

const NS_ERROR_INVALID_ARG     = Components.results.NS_ERROR_INVALID_ARG;

function getDirectoryService()
{
  return Components.classes["@mozilla.org/file/directory_service;1"]
                   .getService(nsIProperties);
}

function quit()
{
  let appStartup = Components.classes["@mozilla.org/toolkit/app-startup;1"]
                             .getService(nsIAppStartup);
  appStartup.quit(nsIAppStartup.eForceQuit);
}

function CommandLineHandler() { }
CommandLineHandler.prototype = {
  classID: Components.ID("{dd20d954-f2a9-11e5-aeae-782bcb9e2c3f}"),

  /* nsISupports */

  QueryInterface : XPCOMUtils.generateQI([nsICommandLineHandler]),

  /* nsICommandLineHandler */

  handle : function clh_handle(cmdLine) {
    var printDir;
    while ((printDir = cmdLine.handleFlagWithParam("print-xpcom-dir", false))) {
      var out = "print-xpcom-dir(\"" + printDir + "\"): ";
      try {
        out += getDirectoryService().get(printDir, nsIFile).path;
      }
      catch (e) {
        out += "<Not Provided>";
      }

      dump(out + "\n");
      Components.utils.reportError(out);
    }

    var printDirList;
    while ((printDirList = cmdLine.handleFlagWithParam("print-xpcom-dirlist",
                                                       false))) {
      out = "print-xpcom-dirlist(\"" + printDirList + "\"): ";
      try {
        var list = getDirectoryService().get(printDirList,
                                             nsISimpleEnumerator);
        while (list.hasMoreElements())
          out += list.getNext().QueryInterface(nsIFile).path + ";";
      }
      catch (e) {
        out += "<Not Provided>";
      }

      dump(out + "\n");
      Components.utils.reportError(out);
    }

    // Firefox, in nsBrowserContentHandler, has a more robust handler
    // for the --chrome flag, which tries to correct typos in the URL
    // being loaded.  But we only need to handle loading devtools in a separate
    // process to debug the app itself, so our implementation is simpler.
    var chromeParam = cmdLine.handleFlagWithParam("chrome", false);
    if (chromeParam) {
      try {
        let resolvedURI = cmdLine.resolveURI(chromeParam);

        let isLocal = uri => {
          let localSchemes = new Set(["chrome", "file", "resource"]);
          if (uri instanceof Components.interfaces.nsINestedURI) {
            uri = uri.QueryInterface(Components.interfaces.nsINestedURI).innerMostURI;
          }
          return localSchemes.has(uri.scheme);
        };
        if (isLocal(resolvedURI)) {
          // If the URI is local, we are sure it won't wrongly inherit chrome privs
          let features = "chrome,dialog=no,all";
          // For the "all" feature to be applied correctly, you must pass an
          // args array with at least one element.
          var args = Components.classes["@mozilla.org/supports-array;1"]
                               .createInstance(Components.interfaces.nsISupportsArray);
          args.AppendElement(null);
          Services.ww.openWindow(null, resolvedURI.spec, "_blank", features, args);
          cmdLine.preventDefault = true;
          return;
        } else {
          dump("*** Preventing load of web URI as chrome\n");
          dump("    If you're trying to load a webpage, do not pass --chrome.\n");
        }
      }
      catch (e) {
        dump(e + '\n');
      }
    }

    let appPath;
    try {
      appPath = cmdLine.getArgument(0);
    } catch (e) {
      if (e.result == NS_ERROR_INVALID_ARG) {
        dump("no app provided\n");
      } else {
        dump("found exception " + e + "\n");
      }
      quit();
      return;
    }

    let appURI = Services.io.newURI(appPath, null, Services.io.newFileURI(cmdLine.workingDirectory));
    dump("Loading app at " + appPath + " with URI " + appURI.spec + "\n");

    // let appBaseDir = cmdLine.resolveFile(appPath);
    // if (!appBaseDir || !appBaseDir.exists()) {
    //   dump("App at '" + appPath + "' does not exist!\n");
    //   quit();
    //   return;
    // }

    let url = appURI.spec;

    const DEFAULT_WINDOW_FEATURES = [
      'chrome',
      'close',
      'dialog=no',
      'extrachrome',
      'resizable',
      'scrollbars',
      'width=1024',
      'height=740',
      'titlebar=no',
    ];

    let features = DEFAULT_WINDOW_FEATURES.slice();

    let window = windowWatcher.openWindow(null, url, '_blank', features.join(','), null);
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

  helpInfo : "",
};

this.NSGetFactory = XPCOMUtils.generateNSGetFactory([CommandLineHandler]);
