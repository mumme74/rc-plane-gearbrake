"use strict";

const notifyTypes = {
    Info: 0,
    Warn: 1,
    Error: 2
}

function notifyUser({msg, type = notifyTypes.Info, time = 3000}) {
    clearInterval(notifyUser._tmr);
    const node = document.getElementById("notifier");
    let classes = "active ";
    switch(type) {
    case notifyTypes.Warn:
        classes += "w3-amber"; break;
    case notifyTypes.Error:
        classes += "errorw3-deep-orange"; break;
    case notifyTypes.Info: // fallthrough
    default:
        classes += "w3-light-blue"; break;
    }
    node.className = classes;
    node.innerHTML = msg;

    notifyUser._tmr = setInterval(()=>{
        node.className = "";
        node.innerHTML = "";
    }, time);
}