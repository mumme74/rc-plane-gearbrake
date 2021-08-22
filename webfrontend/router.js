"use strict";

function routeMainContent() {
    let lang = document.querySelector("html").lang;
    let page = location.hash.replace(/^#/, "");
    let htmlFunctor;

    switch(page) {
    case 'viewloggraphic':
        htmlFunctor = ()=>{return "viewloggraphic"};
        break;
    case 'viewlog':
        htmlFunctor = viewlogHtmlObj.html;
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

    document.getElementById("content").innerHTML = htmlFunctor(lang);
}

document.addEventListener('DOMContentLoaded', routeMainContent);
window.addEventListener('hashchange', (evt)=>{
    evt.stopPropagation();
    evt.preventDefault();
    routeMainContent();
});