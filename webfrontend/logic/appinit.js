"use strict";
{
  // workaround not beeing able to use import/export due must work in filessystem
  /*const jsfiles = [
    "logic/events.js",
    "logic/notifier.js",
    "logic/communication.js",
    "logic/config.js",
    "logic/dataitem.js",
    "logic/logger.js",
    "logic/diagnose.js",
    "logic/router.js",
    "widgets/widgetbase.js",
    "widgets/chartwidget.js",
    "widgets/tablewidget.js",
    "widgets/selecttypeswidget.js",
    "widgets/selectmenuwidget.js",
    "widgets/livedata.js",
    "views/menuview.js",
    "views/welcomepage.js",
    "views/configurepage.js",
    "views/viewlogpage.js",
    "views/settingspage.js",
    "views/diagpage.js",
    "webdfu/dfu-util.js",
    "webdfu/dfu.js",
    "webdfu/dfuse.js"
  ];

  for(let src of jsfiles)
    document.writeln(`<script src="${src}"></script>`);*/

  // Lets us do a quick and easy switch on testing frontend
  // just add #testingGui to hash in url
  // adds a app global variable
  var testing = location.hash.indexOf("testingGui") > -1;

  // select language
  let lang = navigator.language.substring(0, 2); // only use "en" not "en-US"
  if (localStorage.getItem("lang")) {
    lang = localStorage.getItem("lang");
  }
  document.documentElement.lang = lang;


}