# rc-plane-gearbrake
Brake control module for RC-planes (electromagnetic brakes)

Used to implement a break for RC-planes. It basically PWMs up to 3 breaking solenoids in each landing gear.

## hardware at:
https://oshwlab.com/mumme74/rc-brake
Should be possible to order PCB with assemble so you don't have to solder tiny electronics.


![PCB]((https://github.com/mumme74/rc-plane-gearbrake/blob/master/rc-plane-gear-pcb.png?raw=true)



## It has hardware for:
3 outputs at 10A each.
inputs for 3 wheel speed sensors.
accelerometer to aid in ABS braking
EEPROM 128kb to stora settings and datapoints.
USB micro plug (easily config via usb serial)