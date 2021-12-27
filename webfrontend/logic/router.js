"use strict";

function routeMainContent() {
    let lang = document.querySelector("html").lang;
    let parts = location.hash.replace(/^#/, "").split("&");
    let page = parts[0];
    let htmlFunctor;

    switch(page) {
    case 'viewlog':
        htmlFunctor = viewlogHtmlObj.html.bind(viewlogHtmlObj);
        break;
    case 'conf':
        htmlFunctor = configureHtmlObj.html;
        break;
    case 'settings':
        htmlFunctor = appSettingsHtmlObj.html;
        break;
    case 'start': // fallthrough
    default:
        htmlFunctor = welcomeHtmlObj.html;
    }

    htmlFunctor(document.getElementById("content"), lang);
}

document.addEventListener('DOMContentLoaded', routeMainContent);
window.addEventListener('hashchange', (evt)=>{
    evt.stopPropagation();
    evt.preventDefault();
    routeMainContent();
});