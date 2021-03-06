/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

let Ci = Components.interfaces, Cc = Components.classes, Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm")
Cu.import("resource://gre/modules/AddonManager.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

let gStringBundle = Services.strings.createBundle("chrome://browser/locale/aboutAddons.properties");

XPCOMUtils.defineLazyGetter(window, "gChromeWin", function()
  window.QueryInterface(Ci.nsIInterfaceRequestor)
    .getInterface(Ci.nsIWebNavigation)
    .QueryInterface(Ci.nsIDocShellTreeItem)
    .rootTreeItem
    .QueryInterface(Ci.nsIInterfaceRequestor)
    .getInterface(Ci.nsIDOMWindow)
    .QueryInterface(Ci.nsIDOMChromeWindow));

XPCOMUtils.defineLazyGetter(window, "SelectHelper", function() gChromeWin.SelectHelper);

var ContextMenus = {
  target: null,

  init: function() {
    document.addEventListener("contextmenu", this, false);
  },

  handleEvent: function(event) {
    // store the target of context menu events so that we know which app to act on
    this.target = event.target;
    while (!this.target.hasAttribute("contextmenu")) {
      this.target = this.target.parentNode;
    }

    if (!this.target) {
      document.getElementById("contextmenu-enable").setAttribute("hidden", "true");
      document.getElementById("contextmenu-disable").setAttribute("hidden", "true");
      document.getElementById("contextmenu-uninstall").setAttribute("hidden", "true");
      document.getElementById("contextmenu-default").setAttribute("hidden", "true");
      return;
    }

    let addon = this.target.addon;
    if (addon.scope == AddonManager.SCOPE_APPLICATION) {
      document.getElementById("contextmenu-uninstall").setAttribute("hidden", "true");
    } else {
      document.getElementById("contextmenu-uninstall").removeAttribute("hidden");
    }

    let enabled = this.target.getAttribute("isDisabled") != "true";
    if (enabled) {
      document.getElementById("contextmenu-enable").setAttribute("hidden", "true");
      document.getElementById("contextmenu-disable").removeAttribute("hidden");
    } else {
      document.getElementById("contextmenu-enable").removeAttribute("hidden");
      document.getElementById("contextmenu-disable").setAttribute("hidden", "true");
    }

    // Only show the "Set as Default" menuitem for enabled non-default search engines.
    if (addon.type == "search" && enabled && addon.id != Services.search.defaultEngine.name) {
      document.getElementById("contextmenu-default").removeAttribute("hidden");
    } else {
      document.getElementById("contextmenu-default").setAttribute("hidden", "true");
    }
  },

  enable: function(event) {
    Addons.setEnabled(true, this.target.addon);
    this.target = null;
  },
  
  disable: function (event) {
    Addons.setEnabled(false, this.target.addon);
    this.target = null;
  },
  
  uninstall: function (event) {
    Addons.uninstall(this.target.addon);
    this.target = null;
  },

  setDefaultSearch: function(event) {
    Addons.setDefaultSearch(this.target.addon);
    this.target = null;
  }
}

function init() {
  window.addEventListener("popstate", onPopState, false);
  Services.obs.addObserver(Addons, "browser-search-engine-modified", false);

  AddonManager.addInstallListener(Addons);
  AddonManager.addAddonListener(Addons);
  Addons.getAddons();
  showList();
  ContextMenus.init();
}

function uninit() {
  Services.obs.removeObserver(Addons, "browser-search-engine-modified");
  AddonManager.removeInstallListener(Addons);
  AddonManager.removeAddonListener(Addons);
}

function openLink(aElement) {
  try {
    let formatter = Cc["@mozilla.org/toolkit/URLFormatterService;1"].getService(Ci.nsIURLFormatter);
    let url = formatter.formatURLPref(aElement.getAttribute("pref"));
    let BrowserApp = gChromeWin.BrowserApp;
    BrowserApp.addTab(url, { selected: true, parentId: BrowserApp.selectedTab.id });
  } catch (ex) {}
}

function onPopState(aEvent) {
  // Called when back/forward is used to change the state of the page
  if (aEvent.state) {
    // Show the detail page for an addon
    Addons.showDetails(Addons._getElementForAddon(aEvent.state.id));
  } else {
    // Clear any previous detail addon
    let detailItem = document.querySelector("#addons-details > .addon-item");
    detailItem.addon = null;

    showList();
  }
}

function showList() {
  // Hide the detail page and show the list
  let details = document.querySelector("#addons-details");
  details.style.display = "none";
  let list = document.querySelector("#addons-list");
  list.style.display = "block";
}

var Addons = {
  _restartCount: 0,

  _createItem: function _createItem(aAddon) {
    let outer = document.createElement("div");
    outer.setAttribute("addonID", aAddon.id);
    outer.className = "addon-item list-item";
    outer.setAttribute("role", "button");
    outer.setAttribute("contextmenu", "addonmenu");
    outer.addEventListener("click", function() {
      this.showDetails(outer);
      history.pushState({ id: aAddon.id }, document.title);
    }.bind(this), true);

    let img = document.createElement("img");
    img.className = "icon";
    img.setAttribute("src", aAddon.iconURL);
    outer.appendChild(img);

    let inner = document.createElement("div");
    inner.className = "inner";

    let details = document.createElement("div");
    details.className = "details";
    inner.appendChild(details);

    let tagPart = document.createElement("div");
    tagPart.textContent = gStringBundle.GetStringFromName("addonType." + aAddon.type);
    tagPart.className = "tag";
    details.appendChild(tagPart);

    let titlePart = document.createElement("div");
    titlePart.textContent = aAddon.name;
    titlePart.className = "title";
    details.appendChild(titlePart);

    let versionPart = document.createElement("div");
    versionPart.textContent = aAddon.version;
    versionPart.className = "version";
    details.appendChild(versionPart);

    if ("description" in aAddon) {
      let descPart = document.createElement("div");
      descPart.textContent = aAddon.description;
      descPart.className = "description";
      inner.appendChild(descPart);
    }

    outer.appendChild(inner);
    return outer;
  },

  _createItemForAddon: function _createItemForAddon(aAddon) {
    let appManaged = (aAddon.scope == AddonManager.SCOPE_APPLICATION);
    let opType = this._getOpTypeForOperations(aAddon.pendingOperations);
    let updateable = (aAddon.permissions & AddonManager.PERM_CAN_UPGRADE) > 0;
    let uninstallable = (aAddon.permissions & AddonManager.PERM_CAN_UNINSTALL) > 0;

    let blocked = "";
    switch(aAddon.blocklistState) {
      case Ci.nsIBlocklistService.STATE_BLOCKED:
        blocked = "blocked";
        break;
      case Ci.nsIBlocklistService.STATE_SOFTBLOCKED:
        blocked = "softBlocked";
        break;
      case Ci.nsIBlocklistService.STATE_OUTDATED:
        blocked = "outdated";
        break;
    }

    let item = this._createItem(aAddon);
    item.setAttribute("isDisabled", !aAddon.isActive);
    item.setAttribute("opType", opType);
    item.setAttribute("updateable", updateable);
    if (blocked)
      item.setAttribute("blockedStatus", blocked);
    item.setAttribute("optionsURL", aAddon.optionsURL || "");
    item.addon = aAddon;

    return item;
  },

  _getElementForAddon: function(aKey) {
    let list = document.getElementById("addons-list");
    let element = list.querySelector("div[addonID=" + aKey.quote() + "]");
    return element;
  },

  getAddons: function getAddons() {
    let self = this;
    AddonManager.getAddonsByTypes(["extension", "theme", "locale"], function(aAddons) {
      // Clear all content before filling the addons
      let list = document.getElementById("addons-list");
      list.innerHTML = "";

      for (let i=0; i<aAddons.length; i++) {
        let item = self._createItemForAddon(aAddons[i]);
        list.appendChild(item);
      }

      // Load the search engines
      let defaults = Services.search.getDefaultEngines({ }).map(function (e) e.name);
      function isDefault(aEngine)
        defaults.indexOf(aEngine.name) != -1

      let defaultDescription = gStringBundle.GetStringFromName("addonsSearchEngine.description");

      let engines = Services.search.getEngines({ });
      for (let e = 0; e < engines.length; e++) {
        let engine = engines[e];
        let addon = {};
        addon.id = engine.name;
        addon.type = "search";
        addon.name = engine.name;
        addon.version = "";
        addon.description = engine.description || defaultDescription;
        addon.iconURL = engine.iconURI ? engine.iconURI.spec : "";
        addon.optionsURL = "";
        addon.appDisabled = false;
        addon.scope = isDefault(engine) ? AddonManager.SCOPE_APPLICATION : AddonManager.SCOPE_PROFILE;
        addon.engine = engine;

        let item = self._createItem(addon);
        item.setAttribute("isDisabled", engine.hidden);
        item.setAttribute("updateable", "false");
        item.setAttribute("opType", "");
        item.setAttribute("optionsURL", "");
        item.addon = addon;
        list.appendChild(item);
      }
    });
  },

  _getOpTypeForOperations: function _getOpTypeForOperations(aOperations) {
    if (aOperations & AddonManager.PENDING_UNINSTALL)
      return "needs-uninstall";
    if (aOperations & AddonManager.PENDING_ENABLE)
      return "needs-enable";
    if (aOperations & AddonManager.PENDING_DISABLE)
      return "needs-disable";
    return "";
  },

  showDetails: function showDetails(aListItem) {
    // This function removes and returns the text content of aNode without
    // removing any child elements. Removing the text nodes ensures any XBL
    // bindings apply properly.
    function stripTextNodes(aNode) {
      var text = "";
      for (var i = 0; i < aNode.childNodes.length; i++) {
        if (aNode.childNodes[i].nodeType != document.ELEMENT_NODE) {
          text += aNode.childNodes[i].textContent;
          aNode.removeChild(aNode.childNodes[i--]);
        } else {
          text += stripTextNodes(aNode.childNodes[i]);
        }
      }
      return text;
    }

    let detailItem = document.querySelector("#addons-details > .addon-item");
    detailItem.setAttribute("isDisabled", aListItem.getAttribute("isDisabled"));
    detailItem.setAttribute("opType", aListItem.getAttribute("opType"));
    detailItem.setAttribute("optionsURL", aListItem.getAttribute("optionsURL"));
    let addon = detailItem.addon = aListItem.addon;

    let favicon = document.querySelector("#addons-details > .addon-item .icon");
    if (addon.iconURL)
      favicon.setAttribute("src", addon.iconURL);
    else
      favicon.removeAttribute("src");

    detailItem.querySelector(".title").textContent = addon.name;
    detailItem.querySelector(".version").textContent = addon.version;
    detailItem.querySelector(".tag").textContent = gStringBundle.GetStringFromName("addonType." + addon.type);
    detailItem.querySelector(".description-full").textContent = addon.description;
    detailItem.querySelector(".status-uninstalled").textContent =
      gStringBundle.formatStringFromName("addonStatus.uninstalled", [addon.name], 1);

    let enableBtn = document.getElementById("enable-btn");
    if (addon.appDisabled)
      enableBtn.setAttribute("disabled", "true");
    else
      enableBtn.removeAttribute("disabled");

    let uninstallBtn = document.getElementById("uninstall-btn");
    if (addon.scope == AddonManager.SCOPE_APPLICATION)
      uninstallBtn.setAttribute("disabled", "true");
    else
      uninstallBtn.removeAttribute("disabled");

    let defaultButton = document.getElementById("default-btn");
    if (addon.type == "search") {
      if (addon.id == Services.search.defaultEngine.name)
        defaultButton.setAttribute("disabled", "true");
      else
        defaultButton.removeAttribute("disabled");

      defaultButton.removeAttribute("hidden");
    } else {
      defaultButton.setAttribute("hidden", "true");
    }

    let box = document.querySelector("#addons-details > .addon-item .options-box");
    box.innerHTML = "";

    // Retrieve the extensions preferences
    try {
      let optionsURL = aListItem.getAttribute("optionsURL");
      let xhr = new XMLHttpRequest();
      xhr.open("GET", optionsURL, false);
      xhr.send();
      if (xhr.responseXML) {
        // Only allow <setting> for now
        let settings = xhr.responseXML.querySelectorAll(":root > setting");
        if (settings.length > 0) {
          for (let i = 0; i < settings.length; i++) {
            var setting = settings[i];
            var desc = stripTextNodes(setting).trim();
            if (!setting.hasAttribute("desc"))
              setting.setAttribute("desc", desc);
            box.appendChild(setting);
          }
          // Send an event so add-ons can prepopulate any non-preference based
          // settings
          let event = document.createEvent("Events");
          event.initEvent("AddonOptionsLoad", true, false);
          window.dispatchEvent(event);
  
          // Also send a notification to match the behavior of desktop Firefox
          let id = aListItem.getAttribute("addonID");
          Services.obs.notifyObservers(document, AddonManager.OPTIONS_NOTIFICATION_DISPLAYED, id);
        } else {
          // No options, so hide the header and reset the list item
          detailItem.setAttribute("optionsURL", "");
          aListItem.setAttribute("optionsURL", "");
        }
      }
    } catch (e) { }

    let list = document.querySelector("#addons-list");
    list.style.display = "none";
    let details = document.querySelector("#addons-details");
    details.style.display = "block";
  },

  setEnabled: function setEnabled(aValue, aAddon) {
    let detailItem = document.querySelector("#addons-details > .addon-item");
    let addon = aAddon || detailItem.addon;
    if (!addon)
      return;

    let listItem = this._getElementForAddon(addon.id);

    let opType;
    if (addon.type == "search") {
      addon.engine.hidden = !aValue;
      opType = aValue ? "needs-enable" : "needs-disable";
    } else if (addon.type == "theme") {
      if (aValue) {
        // We can have only one theme enabled, so disable the current one if any
        let list = document.getElementById("addons-list");
        let item = list.firstElementChild;
        while (item) {
          if (item.addon && (item.addon.type == "theme") && (item.addon.isActive)) {
            item.addon.userDisabled = true;
            item.setAttribute("isDisabled", true);
            break;
          }
          item = item.nextSibling;
        }
      }
      addon.userDisabled = !aValue;
    } else if (addon.type == "locale") {
      addon.userDisabled = !aValue;
    } else {
      addon.userDisabled = !aValue;
      opType = this._getOpTypeForOperations(addon.pendingOperations);

      if ((addon.pendingOperations & AddonManager.PENDING_ENABLE) ||
          (addon.pendingOperations & AddonManager.PENDING_DISABLE)) {
        this.showRestart();
      } else if (listItem && /needs-(enable|disable)/.test(listItem.getAttribute("opType"))) {
        this.hideRestart();
      }
    }

    if (addon == detailItem.addon) {
      detailItem.setAttribute("isDisabled", !aValue);
      if (opType)
        detailItem.setAttribute("opType", opType);
      else
        detailItem.removeAttribute("opType");
    }

    // Sync to the list item
    if (listItem) {
      listItem.setAttribute("isDisabled", !aValue);
      if (opType)
        listItem.setAttribute("opType", opType);
      else
        listItem.removeAttribute("opType");
    }
  },

  enable: function enable() {
    this.setEnabled(true);
  },

  disable: function disable() {
    this.setEnabled(false);
  },

  uninstall: function uninstall(aAddon) {
    let list = document.getElementById("addons-list");
    let detailItem = document.querySelector("#addons-details > .addon-item");

    let addon = aAddon || detailItem.addon;
    if (!addon)
      return;

    let listItem = this._getElementForAddon(addon.id);

    if (addon.type == "search") {
      // Make sure the engine isn't hidden before removing it, to make sure it's
      // visible if the user later re-adds it (works around bug 341833)
      addon.engine.hidden = false;
      Services.search.removeEngine(addon.engine);
      // the search-engine-modified observer will take care of updating the list
      history.back();
    } else {
      addon.uninstall();
      if (addon.pendingOperations & AddonManager.PENDING_UNINSTALL) {
        this.showRestart();

        // A disabled addon doesn't need a restart so it has no pending ops and
        // can't be cancelled
        let opType = this._getOpTypeForOperations(addon.pendingOperations);
        if (!addon.isActive && opType == "")
          opType = "needs-uninstall";

        detailItem.setAttribute("opType", opType);
        listItem.setAttribute("opType", opType);
      } else {
        list.removeChild(listItem);
        history.back();
      }
    }
  },

  cancelUninstall: function ev_cancelUninstall() {
    let detailItem = document.querySelector("#addons-details > .addon-item");
    let addon = detailItem.addon;
    if (!addon)
      return;

    addon.cancelUninstall();
    this.hideRestart();

    let opType = this._getOpTypeForOperations(addon.pendingOperations);
    detailItem.setAttribute("opType", opType);

    let listItem = this._getElementForAddon(addon.id);
    listItem.setAttribute("opType", opType);
  },

  setDefaultSearch: function setDefaultSearch(aAddon) {
    let addon = aAddon || document.querySelector("#addons-details > .addon-item").addon;
    if (addon.type != "search")
      return;

    let engine = Services.search.getEngineByName(addon.id);

    // Move the new default search engine to the top of the search engine list.
    Services.search.moveEngine(engine, 0);
    Services.search.defaultEngine = engine;

    document.getElementById("default-btn").setAttribute("disabled", "true");
  },

  showRestart: function showRestart() {
    this._restartCount++;
    gChromeWin.XPInstallObserver.showRestartPrompt();
  },

  hideRestart: function hideRestart() {
    this._restartCount--;
    if (this._restartCount == 0)
      gChromeWin.XPInstallObserver.hideRestartPrompt();
  },

  onEnabled: function(aAddon) {
    let listItem = this._getElementForAddon(aAddon.id);
    if (!listItem)
      return;

    // Reload the details to pick up any options now that it's enabled.
    listItem.setAttribute("optionsURL", aAddon.optionsURL || "");
    let detailItem = document.querySelector("#addons-details > .addon-item");
    if (aAddon == detailItem.addon)
      this.showDetails(listItem);
  },

  onInstallEnded: function(aInstall, aAddon) {
    let needsRestart = false;
    if (aInstall.existingAddon && (aInstall.existingAddon.pendingOperations & AddonManager.PENDING_UPGRADE))
      needsRestart = true;
    else if (aAddon.pendingOperations & AddonManager.PENDING_INSTALL)
      needsRestart = true;

    let list = document.getElementById("addons-list");
    let element = this._getElementForAddon(aAddon.id);
    if (!element) {
      element = this._createItemForAddon(aAddon);
      list.insertBefore(element, list.firstElementChild);
    }

    if (needsRestart)
      element.setAttribute("opType", "needs-restart");
  },

  observe: function observe(aSubject, aTopic, aData) {
    if (aTopic == "browser-search-engine-modified") {
      switch (aData) {
        case "engine-added":
        case "engine-removed":
        case "engine-changed":
          this.getAddons();
          break;
      }
    }
  },

  onInstallFailed: function(aInstall) {
  },

  onDownloadProgress: function xpidm_onDownloadProgress(aInstall) {
  },

  onDownloadFailed: function(aInstall) {
  },

  onDownloadCancelled: function(aInstall) {
  }
}
