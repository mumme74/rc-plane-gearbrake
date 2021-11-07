'use strict';

// this is based of https://github.com/devanlai/webdfu

class DfuUtil {
    device = null;
    disabled = true;
    // Current log div element to append to
    logContext = null;
    transferSize = 2048;
    manifestationTolerant = true;
    canDnLoad = false;
    canUpLoad = false;


    _hex4(n) {
        let s = n.toString(16)
        while (s.length < 4) {
            s = '0' + s;
        }
        return s;
    }

    _hexAddr8(n) {
        let s = n.toString(16)
        while (s.length < 8) {
            s = '0' + s;
        }
        return "0x" + s;
    }

    _niceSize(n) {
        const gigabyte = 1024 * 1024 * 1024;
        const megabyte = 1024 * 1024;
        const kilobyte = 1024;
        if (n >= gigabyte) {
            return n / gigabyte + "GiB";
        } else if (n >= megabyte) {
            return n / megabyte + "MiB";
        } else if (n >= kilobyte) {
            return n / kilobyte + "KiB";
        } else {
            return n + "B";
        }
    }

    _formatDFUSummary(device) {
        const vid = this._hex4(device.device_.vendorId);
        const pid = this._hex4(device.device_.productId);
        const name = device.device_.productName;

        let mode = "Unknown"
        if (device.settings.alternate.interfaceProtocol == 0x01) {
            mode = "Runtime";
        } else if (device.settings.alternate.interfaceProtocol == 0x02) {
            mode = "DFU";
        }

        const cfg = device.settings.configuration.configurationValue;
        const intf = device.settings["interface"].interfaceNumber;
        const alt = device.settings.alternate.alternateSetting;
        const serial = device.device_.serialNumber;
        let info = `${mode}: [${vid}:${pid}] cfg=${cfg}, intf=${intf}, alt=${alt}, name="${name}" serial="${serial}"`;
        return info;
    }

    _formatDFUInterfaceAlternate(settings) {
        let mode = "Unknown"
        if (settings.alternate.interfaceProtocol == 0x01) {
            mode = "Runtime";
        } else if (settings.alternate.interfaceProtocol == 0x02) {
            mode = "DFU";
        }

        const cfg = settings.configuration.configurationValue;
        const intf = settings["interface"].interfaceNumber;
        const alt = settings.alternate.alternateSetting;
        const name = (settings.name) ? settings.name : "UNKNOWN";

        return `${mode}: cfg=${cfg}, intf=${intf}, alt=${alt}, name="${name}"`;
    }

    async _fixInterfaceNames(device_, interfaces) {
        // Check if any interface names were not read correctly
        if (interfaces.some(intf => (intf.name == null))) {
            // Manually retrieve the interface name string descriptors
            let tempDevice = new dfu.Device(device_, interfaces[0]);
            await tempDevice.device_.open();
            await tempDevice.device_.selectConfiguration(1);
            let mapping = await tempDevice.readInterfaceNames();
            await tempDevice.close();

            for (let intf of interfaces) {
                if (intf.name === null) {
                    let configIndex = intf.configuration.configurationValue;
                    let intfNumber = intf["interface"].interfaceNumber;
                    let alt = intf.alternate.alternateSetting;
                    intf.name = mapping[configIndex][intfNumber][alt];
                }
            }
        }
    }

    _populateInterfaceList(form, device_, interfaces) {
        let old_choices = Array.from(form.getElementsByTagName("div"));
        for (let radio_div of old_choices) {
            form.removeChild(radio_div);
        }

        let button = form.getElementsByTagName("button")[0];

        for (let i=0; i < interfaces.length; i++) {
            let radio = document.createElement("input");
            radio.type = "radio";
            radio.name = "interfaceIndex";
            radio.value = i;
            radio.id = "interface" + i;
            radio.required = true;

            let label = document.createElement("label");
            label.textContent = this._formatDFUInterfaceAlternate(interfaces[i]);
            label.className = "radio"
            label.setAttribute("for", "interface" + i);

            let div = document.createElement("div");
            div.appendChild(radio);
            div.appendChild(label);
            form.insertBefore(div, button);
        }
    }

    _getDFUDescriptorProperties(device) {
        // Attempt to read the DFU functional descriptor
        // TODO: read the selected configuration's descriptor
        return device.readConfigurationDescriptor(0).then(
            data => {
                let configDesc = dfu.parseConfigurationDescriptor(data);
                let funcDesc = null;
                let configValue = device.settings.configuration.configurationValue;
                if (configDesc.bConfigurationValue == configValue) {
                    for (let desc of configDesc.descriptors) {
                        if (desc.bDescriptorType == 0x21 && desc.hasOwnProperty("bcdDFUVersion")) {
                            funcDesc = desc;
                            break;
                        }
                    }
                }

                if (funcDesc) {
                    return {
                        WillDetach:            ((funcDesc.bmAttributes & 0x08) != 0),
                        ManifestationTolerant: ((funcDesc.bmAttributes & 0x04) != 0),
                        CanUpload:             ((funcDesc.bmAttributes & 0x02) != 0),
                        CanDnload:             ((funcDesc.bmAttributes & 0x01) != 0),
                        TransferSize:          funcDesc.wTransferSize,
                        DetachTimeOut:         funcDesc.wDetachTimeOut,
                        DFUVersion:            funcDesc.bcdDFUVersion
                    };
                } else {
                    return {};
                }
            },
            error => {}
        );
    }

    setLogContext(div) {
        this.logContext = div;
    }

    clearLog(context) {
        if (typeof context === 'undefined') {
            context = this.logContext;
        }
        if (context) {
            context.innerHTML = "";
        }
    }

    logDebug(msg) {
        console.log(msg);
    }

    logInfo(msg) {
        if (this.logContext) {
            let info = document.createElement("p");
            info.className = "info";
            info.textContent = msg;
            this.logContext.appendChild(info);
        }
    }

    logWarning(msg) {
        if (this.logContext) {
            let warning = document.createElement("p");
            warning.className = "warning";
            warning.textContent = msg;
            this.logContext.appendChild(warning);
        }
    }

    logError(msg) {
        if (this.logContext) {
            let error = document.createElement("p");
            error.className = "error";
            error.textContent = msg;
            this.logContext.appendChild(error);
        }
    }

    logProgress(done, total) {
        if (this.logContext) {
            let progressBar;
            if (this.logContext.lastChild.tagName.toLowerCase() == "progress") {
                progressBar = this.logContext.lastChild;
            }
            if (!progressBar) {
                progressBar = document.createElement("progress");
                this.logContext.appendChild(progressBar);
            }
            progressBar.value = done;
            if (typeof total !== 'undefined') {
                progressBar.max = total;
            }
        }
    }

    constructor(connectCb, disconnctCb, firmwareFileField, uploadLog, downloadLog) {
        const vid = 0x0483;
        const pid = 0xdf11;

        this.connectCb = connectCb;
        this.disconnctCb = disconnctCb;
        this.firmwareFileField = firmwareFileField;
        this.uploadLog = uploadLog;
        this.downloadLog = downloadLog;

        // Check if WebUSB is available
        if (typeof navigator.usb !== 'undefined') {
            this.disabled = false;
            navigator.usb.addEventListener("disconnect", this.onUnexpectedDisconnect);
        } else {
            notifyUser({msg: 'WebUSB not available.', type:notifyTypes.Warn});
        }

        let infoDisplay = document.querySelector("#usbInfo");
        let interfaceDialog = document.querySelector("#interfaceDialog");
        let interfaceForm = document.querySelector("#interfaceForm");
        let interfaceSelectButton = document.querySelector("#selectInterface");

        let configForm = document.querySelector("#configForm");

        let dfuseStartAddressField = document.querySelector("#dfuseStartAddress");
        let dfuseUploadSizeField = document.querySelector("#dfuseUploadSize");
    }

    onConnect() {
        this.connectCb();
    }

    onDisconnect(reason) {
        if (reason) {
            notifyUser({msg: reason});
        }

        this.disconnctCb();
    }

    onUnexpectedDisconnect(event) {
        if (this.device?.device) {
            if (this.device.device_ === event.device) {
                this.device.disconnected = true;
                onDisconnect("Device disconnected");
                this.device = null;
            }
        }
    }

    async _connect(device) {
        try {
            await device.open();
        } catch (error) {
            this.onDisconnect(error);
            throw error;
        }

        // Attempt to parse the DFU functional descriptor
        let desc = {};
        try {
            desc = await this._getDFUDescriptorProperties(device);
        } catch (error) {
            this.onDisconnect(error);
            throw error;
        }

        let memorySummary = "";
        if (desc && Object.keys(desc).length > 0) {
            device.properties = desc;
            let info = {WillDetach:desc.WillDetach,
                        ManifestationTolerant:desc.ManifestationTolerant,
                        CanUpload:desc.CanUpload,
                        CanDnload:desc.CanDnload,
                        TransferSize:desc.TransferSize,
                        DetachTimeOut:desc.DetachTimeOut,
                        Version:this._hex4(desc.DFUVersion)};
            this.logDebug(info);
            this.transferSize = desc.TransferSize;
            this.canDnLoad = desc.CanDnload;
            this.canUpLoad = desc.CanUpload;
            if (desc.CanDnload) {
                this.manifestationTolerant = desc.ManifestationTolerant;
            }

            if (desc.DFUVersion == 0x011a && device.settings.alternate.interfaceProtocol == 0x02) {
                this.device = new dfuse.Device(device.device_, device.settings);
                if (this.device.memoryInfo) {
                    let totalSize = 0;
                    for (let segment of this.device.memoryInfo.segments) {
                        totalSize += segment.end - segment.start;
                    }
                    memorySummary = `Selected memory region: ${this.device.memoryInfo.name} (${this._niceSize(totalSize)})`;
                    for (let segment of this.device.memoryInfo.segments) {
                        let properties = [];
                        if (segment.readable) {
                            properties.push("readable");
                        }
                        if (segment.erasable) {
                            properties.push("erasable");
                        }
                        if (segment.writable) {
                            properties.push("writable");
                        }
                        let propertySummary = properties.join(", ");
                        if (!propertySummary) {
                            propertySummary = "inaccessible";
                        }

                        memorySummary += `\n${this._hexAddr8(segment.start)}-${this._hexAddr8(segment.end-1)} (${propertySummary})`;
                    }
                }
            }
        }

        // Bind logging methods
        this.device.logDebug = this.logDebug.bind(this);
        this.device.logInfo = this.logInfo.bind(this);
        this.device.logWarning = this.logWarning.bind(this);
        this.device.logError = this.logError.bind(this);
        this.device.logProgress = this.logProgress.bind(this);

        // Clear logs
        this.clearLog(this.uploadLog);
        this.clearLog(this.downloadLog);

        // Display basic USB information
        this.logDebug(
            "Name: " + this.device.device_.productName + "\n" +
            "MFG: " + this.device.device_.manufacturerName + "\n" +
            "Serial: " + this.device.device_.serialNumber + "\n"
        );

        // Display basic dfu-util style info
        this.logDebug(this._formatDFUSummary(this.device) + "\n" + memorySummary);

        if (this.device.memoryInfo) {
            let segment = this.device.getFirstWritableSegment();
            if (segment) {
                this.device.startAddress = segment.start;
            }
        }

        return this.device;
    }

    async connect() {
        if (this.device) {
            this.device.close().then(onDisconnect);
            this.device = null;
        } else {
            let filters = [{ 'vendorId': 0x0483 }];

            navigator.usb.requestDevice({ 'filters': filters }).then(
                async selectedDevice => {
                    let interfaces = dfu.findDeviceDfuInterfaces(selectedDevice);
                    if (interfaces.length == 0) {
                        console.log(selectedDevice);
                        notifyUser({msg: 'The selected device does not have any USB DFU interfaces.', type:notifyTypes.Warn});
                    } else /*if (interfaces.length == 1)*/ {
                        await this._fixInterfaceNames(selectedDevice, interfaces);
                        this.device = await this._connect(new dfu.Device(selectedDevice, interfaces[0]));
                    }/* else {
                        await this._fixInterfaceNames(selectedDevice, interfaces);
                        this._populateInterfaceList(interfaceForm, selectedDevice, interfaces);
                        async function connectToSelectedInterface() {
                            interfaceForm.removeEventListener('submit', this);
                            const index = interfaceForm.elements["interfaceIndex"].value;
                            this.device = await this._connect(new dfu.Device(selectedDevice, interfaces[index]));
                        }

                        interfaceForm.addEventListener('submit', connectToSelectedInterface);

                        interfaceDialog.addEventListener('cancel', function () {
                            interfaceDialog.removeEventListener('cancel', this);
                            interfaceForm.removeEventListener('submit', connectToSelectedInterface);
                        });

                        interfaceDialog.showModal();
                    }*/
                    if (this.device) this.onConnect();
                }
            ).catch(error => {
                notifyUser({msg: error, type:notifyTypes.Warn});
            });
        }
    }

    async disconnect() {
        if (this.device) {
            this.device.detach().then(
                async len => {
                    let detached = false;
                    try {
                        await this.device.close();
                        await this.device.waitDisconnected(5000);
                        detached = true;
                    } catch (err) {
                        console.log("Detach failed: " + err);
                    }

                    onDisconnect();
                    this.device = null;
                    if (detached) {
                        // Wait a few seconds and try reconnecting
                        setTimeout(autoConnect, 5000);
                    }
                },
                async error => {
                    await this.device.close();
                    this.onDisconnect(error);
                    this.device = null;
                }
            );
        }
    }

    _saveAs (blob, filename) {
        console.log(typeof(blob)) //let you have 'blob' here

        var blobUrl = URL.createObjectURL(blob);

        var link = document.createElement("a"); // Or maybe get it from the current document
        link.href = blobUrl;
        link.download = filename;
        link.innerHTML = "Click here to download the file";

        this.uploadLog.appendChild(link); // Or append it whereever you want
        this.uploadLog.querySelector('a').click() //can add an id to be specific if multiple anchor tag, and use #id
        setTimeout(()=>{this.uploadLog.removeChild(link)}, 1000);
    }

    async upload() {

        if (!this.device || !this.device.device_.opened) {
            onDisconnect();
            this.device = null;
        } else {
            this.setLogContext(this.uploadLog);
            this.clearLog(this.uploadLog);
            try {
                let status = await this.device.getStatus();
                if (status.state == dfu.dfuERROR) {
                    await this.device.clearStatus();
                }
            } catch (error) {
                this.device.logWarning("Failed to clear status");
            }

            // stm32f042F4P6 has max 16kb
            const maxSize = 16 * 1024;
            try {
                const blob = await this.device.do_upload(this.transferSize, maxSize);
                this._saveAs(blob, "firmware.bin");
            } catch (error) {
                logError(error);
            }

            this.setLogContext(null);
        }

        return false;
    }

    _readFileAsync(file) {
        return new Promise((resolve, reject) => {
          let reader = new FileReader();

          reader.onload = () => {
            resolve(reader.result);
          };

          reader.onerror = reject;

          reader.readAsArrayBuffer(file);
        })
      }

    async download() {
        if (this.device) {
            if (!this.firmwareFileField.files.length) {
                notifyUser({msg:"No file selected!"})
                return;
            }

            this.setLogContext(this.downloadLog);
            this.clearLog(this.downloadLog);

            let firmwareFile = await this._readFileAsync(this.firmwareFileField.files[0]);

            try {
                let status = await this.device.getStatus();
                if (status.state == dfu.dfuERROR) {
                    await this.device.clearStatus();
                }
            } catch (error) {
                this.device.logWarning("Failed to clear status");
            }
            await this.device.do_download(this.transferSize, firmwareFile, this.manifestationTolerant).then(
                () => {
                    this.logInfo("Done!");
                    this.setLogContext(null);
                    if (!this.manifestationTolerant) {
                        this.device.waitDisconnected(5000).then(
                            dev => {
                                this.onDisconnect();
                                this.device = null;
                            },
                            error => {
                                // It didn't reset and disconnect for some reason...
                                console.log("Device unexpectedly tolerated manifestation.");
                            }
                        );
                    }
                },
                error => {
                    this.logError(error);
                    this.setLogContext(null);
                }
            )
        }

        //return false;
    }
}
