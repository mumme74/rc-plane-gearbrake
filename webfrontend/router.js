"use strict";

function routeMainContent() {
    let lang = document.querySelector("html").lang;
    let page = location.hash.replace(/^#/, "");
    let content;

    switch(page) {
    case 'viewloggraphic':
        content = "viewloggraphic";
        break;
    case 'viewlog':
        content = viewlogObj.html(lang);
        break;
    case 'conf':
        content = configureObj.html(lang);
        break;
    case 'settings':
        content = settingsObj.html(lang);
        break;
    case 'start': // fallthrough
    default:
        content = welcomeObj.html(lang);
    }

    document.getElementById("content").innerHTML = content;
}

document.addEventListener('DOMContentLoaded', routeMainContent);
window.addEventListener('hashchange', routeMainContent);