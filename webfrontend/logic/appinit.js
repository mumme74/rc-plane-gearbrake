"use strict";
{
    // Lets us do a quick and easy switch on testing frontend
    // just add #testingGui to hash in url
    // adds a app global variable
    var testing = location.hash.indexOf("testingGui") > -1;

    // select language
    let lang;
    if (localStorage.getItem("lang")) {
      lang = localStorage.getItem("lang");
    } else {
      lang = navigator.language.substr(0, 2); // only use "en" not "en-US"
    }
    document.querySelector("html").lang = lang;
}