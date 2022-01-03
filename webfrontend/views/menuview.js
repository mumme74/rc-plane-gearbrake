// Used to toggle the menu on small screens when clicking on the menu button
document.addEventListener('DOMContentLoaded', () =>{
    let navPopup = document.getElementById("navPopup");
    let lang = document.querySelector("html").lang;

    function toggleMenu() {
        if (navPopup.classList.contains("w3-show")) {
            navPopup.classList.remove("w3-show");
        } else {
            navPopup.classList.add("w3-show");
        }
    };

    const classes = {
        menubtn: "w3-bar-item w3-button w3-hide-medium w3-hide-large w3-right w3-padding-large w3-hover-white w3-large w3-red",
        home: "w3-bar-item w3-button w3-padding-large w3-white",
        bar: "w3-bar-item w3-button w3-hide-small w3-padding-large w3-hover-white",
        popup: "w3-bar-item w3-button w3-padding-large w3-white"
    };

    const menuItems = [
        {action: toggleMenu, txt: {en: '☰', sv: '☰'}, cls: classes.menubtn},
        {txt: {en: "Home", sv: "Hem"}, cls: classes.home, hash: ""},
        {txt: {en: "Configure", sv: "Konfigurera"}, hash: "conf"},
        {txt: {en: "View log", sv: "Visa log"}, hash: "viewlog"},
        {txt: {en: "Settings", sv: "Inställningar"}, hash: "settings"},
        {id: "connectBtn", action: async (event)=>{
            let res = await CommunicationBase.instance().toggleDevice();
            event.target.classList[res ? 'add' : 'remove']("connected")
        }, txt: "&#x1F517;",
            tip: {en: "Toggle connection to device",
                  sv: "Toggla anslutning till enhet"},
         cls: classes.bar + " connectBtn"}
    ];

    function buildLink(itm, parent) {
        let a = document.createElement("a");
        let hashParts = location.hash.replace("/^#/", "").split("&");
        hashParts[0] = itm.hash;
        a.href = typeof itm.hash === 'string' ? `#${hashParts.join("&")}` : "javascript:void(0)";
        a.className = itm.cls || classes.bar;
        a.innerHTML = typeof itm.txt === 'string' ? itm.txt : itm.txt[lang];
        if (itm.tip)
            a.title = itm.tip[lang];
        if (itm.action)
            a.addEventListener("click", itm.action);
        else
            a.addEventListener("click", (evt)=>{
                evt.stopPropagation(); evt.preventDefault();
                location.hash = hashParts.join("&");
            })
        if (itm.id)
            a.id = itm.id;
        parent.appendChild(a);
    }

    let menuBar = document.querySelector("#menuBar");
    menuItems.forEach(itm => {
        buildLink(itm, menuBar);
    });

    menuItems.shift();
    menuItems.forEach(itm => {
        itm.cls = classes.popup;
        buildLink(itm, navPopup);
    });

    let progress = document.createElement("progress");
    progress.value = 0;
    menuBar.appendChild(progress);
    CommunicationBase.progress.registerCallback((value)=>{
      progress.value = value;
    });
    CommunicationBase.instance().onConnect(()=>{
        document.querySelector(".connectBtn").classList.add("connected");
    });
    CommunicationBase.instance().onDisconnect(()=>{
        document.querySelector(".connectBtn").classList.remove("connected");
    });
});

function menuCloseConnection() {
    let link = document.getElementById("connectBtn");
    if (link.classList.contains("connected"))
        link.click();
}
