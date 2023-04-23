/**
 * @file hardware_test.ino
 * @author Fredrik Johansson (mumme74@github.com)
 * @brief Code to Run in a Ardino Mega 2560
 * @version 0.1
 * @date 2023-04-23
 *
 * Uses a patched Servo and Tone lib, changed to not
 * Interfere with each others hardware timers
 */

/**
 * Wire as such:
 * Arduino                        RC-gearbrake
 * +----------+                   +-----------+
 * |         9|-------------------|out2-      |
 * |         8|-------------------|out1-      |
 * |         7|-------------------|out0-      |
 * |         6|--R1k-------*------|wh_sp2_in  |
 * |         5|--R1k----*--|------|wh_sp1_in  |
 * |         4|--R1k-*--|--|------|wh_sp0_in  |
 * |         3|------|--|--|------|rcv_sig    |
 * |        5V|------|--|--|------|+bat       |
 * |       GND|--*---|--|--|------|-bat       |
 * +----------+  |   |  |  |      +-----------+
 *               *-R2k  |  |
 *               *-----R2k |
 *               *--------R2k
 *
 * R1k = 1000 ohm resistor
 * R2k = 2000 ohm resistor
 * Both complete a 5V->3.3V voltage divider
 */

#include "MyTone.h"
#include "MyServo.h"

const char help[] = "begin\n"
" Send electrical pulses to rc-gearbrake\n"
" serial baud 115200 8n1\n"
"\n"
" Commands: (all in ascii)\n"
" out0, out1, out2 = return the duty cycle our board gives\n"
"\n"
" rcv=vlu  Set brake force as given from a RC reciever.\n"
"          vlu can be: 0-100\n"
"\n"
" wh-speed0=.. wh-speed1=.. wh-speed2=vlu  Set wheel speed as pulses from speed sensors\n"
"          vlu can be: 0-100\n"
"\n"
" wh-pulses0=.. wh-pulses1=.. wh-pulses2=vlu  Set nr of pulses per rev at each wheel\n"
"          vlu can be: 1-30\n";


const int PWM_OUT0_PIN = 9,
          PWM_OUT1_PIN = 8,
          PWM_OUT2_PIN = 7,
          RCV_PIN = 3,
          WHEEL0_PIN = 4,
          WHEEL1_PIN = 5,
          WHEEL2_PIN = 6;

int outs[] = { PWM_OUT0_PIN, PWM_OUT1_PIN, PWM_OUT2_PIN };
int wheel_pins[] = { WHEEL0_PIN, WHEEL1_PIN, WHEEL2_PIN };
int wheel_tooths[] = {10,10,10};

Tone wheel_tones[] = {
  Tone(), Tone(), Tone()
};

Servo rcv;

char buf[60];

class Cmds;

typedef void (*callback)(Cmds*);

class Cmds {
  const String _cmd;
  const int _min, _max;
  callback _getCb, _setCb;
  bool _hasCh;
public:
  int vlu, ch;
  Cmds(String cmd, int min, int max,
       callback getCb, callback setCb,
       bool hasCh) :
    _cmd(cmd), _min(min), _max(max),
    _getCb(getCb), _setCb(setCb),
    _hasCh(hasCh),
    vlu(-1), ch(-1)
  { }

  bool parse(const String &line) {
    if (line.startsWith(_cmd)) {
      int pos = _parseCh(line);
      if (_hasCh && ch < 0) return true; // error already reported
      const char *pre;
      if (_parseVlu(line, pos)) {
        if (_setCb) _setCb(this);
        pre = "Set";
      } else {
        if(_getCb) _getCb(this);
        pre = "Get";
      }

      if (_hasCh)
        sprintf(buf, "%s %s%d=%d", pre, _cmd.c_str(), ch, vlu);
      else
        sprintf(buf, "%s %s=%d", pre, _cmd.c_str(), vlu);
      Serial.print(buf);

      return true;
    }
    return false;
  }

  bool _parseVlu(const String &line, int pos) {
    if (line.substring(pos, pos+1) != "=")
      return false;
    vlu = line.substring(pos+1).toInt();
    if (vlu < _min || vlu > _max) {
      sprintf(buf, "Wrong value given:%d, min:%d max:%d", vlu, _min, _max);
      Serial.println(buf);
      return false;
    }
    return true;
  }

  int _parseCh(const String &line) {
    int pos = _cmd.length();
    if (!_hasCh) return pos;

    auto sCh = line.substring(pos, pos+1);
    if (!isDigit(sCh.charAt(0))) {
      sprintf(buf, "Expected number 0-2 as channel selector, got:%s", sCh);
      Serial.println(buf);
      return pos;
    }

    ch = sCh.toInt();
    if (ch < 0 || ch > 2) {
      sprintf(buf, "Expected 0-2 as channel selector, got:%d", ch);
      Serial.println(buf);
      ch = -1;
    }
    return pos+1;
  }
};


void getOut(Cmds* cmd) {
  unsigned long high = pulseIn(outs[cmd->ch], HIGH, 300000L),
                low = pulseIn(outs[cmd->ch], LOW, 300000L);
  cmd->vlu = high > 0 && low > 0 ? (low * 100) / (low + high) : 0;
}

void setRcv(Cmds *cmd) {
  rcv.write(cmd->vlu * 180 / 100);
}

void getRcv(Cmds *cmd) {
  cmd->vlu = rcv.read() * 100 / 180;
}

void setWheelSpeed(Cmds *cmd) {
  wheel_tones[cmd->ch].play(wheel_tooths[cmd->ch] * cmd->vlu);
}

void getWheelSpeed(Cmds *cmd) {
  cmd->vlu = wheel_tones[cmd->ch].read() / wheel_tooths[cmd->ch];
}

void setWheelPulses(Cmds *cmd) {
  wheel_tooths[cmd->ch] = cmd->vlu;
}

void getWheelPulses(Cmds *cmd) {
  cmd->vlu = wheel_tooths[cmd->ch];
}

void helpCb(Cmds *prop) {
  (void)prop;
  Serial.print(help);
}

const Cmds cmds[] = {
  Cmds(String("help"), 0,0, helpCb, nullptr, false),
  Cmds(String("rcv"),0,100,getRcv,setRcv,false),
  Cmds(String("out"),0,100,getOut,nullptr, true),
  Cmds(String("wh-speed"),0,255,getWheelSpeed,setWheelSpeed, true),
  Cmds(String("wh-pulses"),0,30,getWheelPulses,setWheelPulses, true)
};

void setup()
{
  pinMode(PWM_OUT0_PIN, INPUT_PULLUP);
  pinMode(PWM_OUT1_PIN, INPUT_PULLUP);
  pinMode(PWM_OUT2_PIN, INPUT_PULLUP);

  pinMode(RCV_PIN, OUTPUT);

  pinMode(WHEEL0_PIN, OUTPUT);
  pinMode(WHEEL1_PIN, OUTPUT);
  pinMode(WHEEL2_PIN, OUTPUT);

  Serial.begin(115200);

  rcv.attach(RCV_PIN);
  rcv.write(0);

  for (size_t i = 0; i < sizeof(wheel_tones) / sizeof(wheel_tones[0]); ++i) {
    wheel_tones[i].begin(wheel_pins[i]);
  }
}

void loop()
{
  if (Serial.available() > 0) {
    String line = Serial.readString();
    line.trim();

    for (size_t i = 0; i < sizeof(cmds)/sizeof(cmds[0]); ++i) {
      if (cmds[i].parse(line)) break;
    }
  }
}
