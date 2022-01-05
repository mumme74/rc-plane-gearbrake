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
        res = self.iep.read(self.iep.wMaxPacketSize, 10000)
        self.bytes = 0
        if res and res[1] & 0x80:
            #multiframe response
            rcvd = bytes()
            bytRcvd = 0
            while (res):
                cb(res)
                if (res and res[1] & 0x80):
                    #multibyte
                    if (res[0] > 4 and (res[3] or res[4])):
                        self.bytes += (res[0] -5)
                    rcvd += res
                    res = self.iep.read(self.iep.wMaxPacketSize, 20000)
                    self._testAlignment(res)
                else:
                    break
        else:
            cb(res)
            rcvd = res

        return rcvd

    def _testAlignment(self, res):
        #test memory alignment incremented
        if len(res) > 5:
            pkgNr = res[3] << 8 | res[4]
            if not hasattr(self, '_pkgNr'): self._pkgNr = pkgNr
            if pkgNr != (self._pkgNr):
                raise ValueError('pkg: {} was not in order, last was {}', pkgNr, self._pkgNr)
            self._pkgNr += 1
            print('bytes:{}\n'.format(self.bytes))

            if not hasattr(self, '_cmp'):
                self._cmp = res[5]
            for i in res[5:]:
                if i != self._cmp:
                    raise ValueError('pkgs ' + str(res[3]) +', ' \
                        + str(res[4]) + ' expect != got ' + str(i) + '!=' + str(self._cmp) \
                        +', was not aligned')
                self._cmp += 1 if self._cmp < 255 else -255


def send(usbCls, data):
    # build the data
    data = re.sub(r'[\s,]+', ',', data.strip())
    data = [parseInt(byte) for byte in data.split(',')]
    data.insert(0, len(data)+1)
    if len(data) < 3:
        data.append(1) # default reqId
    res = usbCls.send(data, lambda r: print(r))
    print("total bytes recieved:" + str(len(res)))
    print("data recv:{}".format(usbCls.bytes))


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
