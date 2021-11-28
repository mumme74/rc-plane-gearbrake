#!/usr/bin/env python

# from https://github.com/fpoussin/MotoLink/blob/master/code/binsize.py

from subprocess import Popen, PIPE

class app(object):
    def __init__(self):
        pass

gearbrake = app()
gearbrake.name = "gearbrake"
gearbrake.path = "build/gearbrake.elf"
gearbrake.max_ccm = 2*1024
gearbrake.max_ram = 6*1024
gearbrake.max_rom = 16*1024

APPS = [gearbrake]

for app in APPS:

    ccm = 0
    ram = 0
    rom = 0

    p = Popen(["arm-none-eabi-size", "-A", app.path], stdout=PIPE)

    if p.wait() == 0:

        output = p.stdout.read()
        lines = filter(None, output.split(b"\n"))

        for line in lines:
            columns = list(filter(None, line.split(b" ")))
            if b".stacks" in columns[0]:
                ram += int(columns[1])
            elif b".ram4" in columns[0]:
                ccm += int(columns[1])
                rom += int(columns[1])
            elif b".bss" in columns[0]:
                ram += int(columns[1])
            elif b".data" in columns[0] or b".ram0" in columns[0]:
                ram += int(columns[1])
                rom += int(columns[1])
            elif b".text" in columns[0]:
                rom += int(columns[1])
            elif b".startup" in columns[0]:
                rom += int(columns[1])
            elif b".rodata" in columns[0]:
                rom += int(columns[1])

        print ("\n" + app.name + ":")
        #print ("CCM used: {}% - {:4.1f}/{}k".format((ccm*100)/app.max_ccm,
        #                                           ccm/1024.0,
        #                                           app.max_ccm/1024.0))

        print ("RAM used: {}% - {}/{}".format((ram*100)/app.max_ram,
                                                   ram,
                                                   app.max_ram))

        print ("ROM used: {}% - {}/{}".format((rom*100)/app.max_rom,
                                                   rom,
                                                   app.max_rom))
