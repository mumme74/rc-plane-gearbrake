"use strict";

class Router {
  _pages = [];

  constructor() {
    document.addEventListener('DOMContentLoaded', this.routeMain.bind(this));
    window.addEventListener('hashchange', ((evt)=>{
      evt.stopPropagation();
      evt.preventDefault();
      this.routeMain();
    }).bind(this));
  }

  registerPage(pageCls, name) {
    this._pages.push({cls:pageCls, name});
  }

  routeMain() {
    const name = location.hash.replace(/^#/, "").split("&")[0];
    let o = this._pages.find(p=>p.name===name);
    if (!o) o = this._pages.find(p=>p.name==='');

    const cls = o.cls;

    const parentNode = document.getElementById('content');
    const lang = document.documentElement.lang;

    if (typeof cls.beforeHook === 'function')
      cls.beforeHook(parentNode, lang);

    // render main content
    cls.html(parentNode, lang);

    // set up events
    this.fixEvents(cls, parentNode);

    // post render event
    if (typeof cls.afterHook === 'function')
      cls.afterHook(parentNode, lang);
  }

  fixEvents(cls, parentNode) {
    ["onclick", "onselect", "onchange"].forEach((evtname)=>{
      const evts = parentNode.querySelectorAll(`* [${evtname}]`);
      evts.forEach(node=>{
        if (/\{\s*this/.test(node[evtname].toString())) {
          const cb = node[evtname];
          node[evtname] = function(){cb.apply(cls, arguments);}
        }
      });
    });
  }
}

const router = new Router();
