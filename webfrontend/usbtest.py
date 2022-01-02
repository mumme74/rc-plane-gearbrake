#!/usr/bin/env python

import usb.core
import usb.util
import readline
import sys
import re

def parseInt(intStr):
    try:
        vlu = int(intStr)
    except ValueError:
        vlu = int(intStr, base=16)
    return vlu

class LandingBrake():
    def __init__(self):
        self.dev = usb.core.find(idVendor=0x0483, idProduct=0x5722)

        # was it found?
        if self.dev is None:
            raise ValueError('Device not found')

        # set the active configuration. With no arguments, the first
        # configuration will be the active one
        self.dev.set_configuration()

        # get an endpoint instance
        cfg = self.dev.get_active_configuration()
        intf = cfg[(0,0)]
        def matchfn(match): \
            return lambda e: \
                    usb.util.endpoint_direction(e.bEndpointAddress) == \
                    match

            # match the first OUT endpoint
        self.oep = usb.util.find_descriptor(intf, \
                    custom_match = matchfn(usb.util.ENDPOINT_OUT))
        self.iep = usb.util.find_descriptor(intf, \
                    custom_match = matchfn(usb.util.ENDPOINT_IN))

        assert self.oep is not None
        assert self.iep is not None

    def send(self, data, cb = lambda r: None):
        # write the data
        self.dev.reset()
        self.oep.write(bytes(data))
        res = self.iep.read(10000,10000)
        cb(res)

        if res and res[1] & 0x80:
            #multiframe response
            rcvd = bytes()

            while (res):
                res = self.iep.read(100000,1000)
                cb(res)
                if (res and res[1] & 0x80):
                    rcvd += res
                else:
                    break
        else:
            rcvd = res

        return rcvd

def send(usbCls, data):
    # build the data
    data = re.sub(r'[\s,]+', ',', data.strip())
    data = [parseInt(byte) for byte in data.split(',')]
    data.insert(0, len(data)+1)
    if len(data) < 3:
        data.append(1) # default reqId
    res = usbCls.send(data, lambda r: print(r, '\n'))
    print("bytes recieved:" + str(len(res)))


if __name__ == '__main__':
    comms = LandingBrake()
    if len(sys.argv) > 1:
        if sys.argv[1] == '?':
            print(comms.dev)
        else:
            send(comms, ' '.join(sys.argv[1:]))
    else:
        olddata = None
        while True:
            try:
                data = input("Bytes to send: ")
            except KeyboardInterrupt: break
            if not data: data = olddata
            if data:
                olddata = data
                send(comms, data)
