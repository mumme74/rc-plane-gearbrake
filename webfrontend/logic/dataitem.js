"use strict";

/**
 * @brief ItemBase is a single data item, such as the value
 *        of accelerometer at single point in time
 */
 class ItemBase {
    static TypesTranslated = {
        uninitialized: {
            txt: {en: "Unintialized", sv: "Oinitialiserad"},
            title: {en: "Not valid", sv: "Ej gilltig"}
        },

        // speed as in wheel revs / sec
        speedOnGround: {
            txt: {en: "Wheel revs on ground", sv: "Hjul rotation på marken"},
            title: {en: "Calculated speed on the ground", sv: "Beräknad hastighet på marken"}
        },
        wheelRPS_0: {
            txt: {en: "Wheel sensor 0", sv: "Hjulsensor 0"},
            title: {en: "Measured value", sv: "Uppmätt värde"}
        },
        wheelRPS_1: {
            txt: {en: "Wheel sensor 1", sv: "Hjulsensor 1"},
            title: {en: "Measured value", sv: "Uppmätt värde"}
        },
        wheelRPS_2: {
            txt: {en: "Wheel sensor 2", sv: "Hjulsensor 2"},
            title: {en: "Measured value", sv: "Uppmätt värde"}
        },
        // brake force
        wantedBrakeForce: {
            txt: {en: "Requested brakeforce", sv: "Begärd bromskraft"},
            title: {en: "Brakeforce from reciever", sv: "Bromskraft från mottagaren"}
        },
        calcBrakeForce: {
            txt: {en: "Calculated brakeforce", sv: "Beräknad bromskraft"},
            title: {en: "Brakeforce after input filter", sv: "Bromskraft efter ingångsfilter"}
        },
        brakeForce0_out: {
            txt: {en: "Brake 0 output force", sv: "Broms 0 utkraft"},
            title: {
            en: "Brake 0 force sent to wheel brake 0-100%",
            sv: "Broms 0 kraft sänt till hjulbroms"
            }
        },
        brakeForce1_out: {
            txt: {en: "Brake 1 output force", sv: "Broms 1 utkraft"},
            title: {
            en: "Brake 1 force sent to wheel brake 0-100%",
            sv: "Broms 1 kraft sänt till hjulbroms"
            }
        },
        brakeForce2_out: {
            txt: {en: "Brake 2 output force", sv: "Broms 2 utkraft"},
            title: {
            en: "Brake 2 force sent to wheel brake 0-100%",
            sv: "Broms 2 kraft sänt till hjulbroms"
            }
        },
        // wheel slip
        slip0: {
            txt: {en: "Brake 0 wheel slip", sv: "Broms 0 hjulsläpp"},
            title: {
            en: "Brake 0 calculated wheel slippage",
            sv: "Broms 0 beräknat hjulsläpp"
            }
        },
        slip1: {
            txt: {en: "Brake 1 wheel slip", sv: "Broms 1 hjulsläpp"},
            title: {
            en: "Brake 1 calculated wheel slippage",
            sv: "Broms 1 beräknat hjulsläpp"
            }
        },
        slip2: {
            txt: {en: "Brake 2 wheel slip", sv: "Broms 2 hjulsläpp"},
            title: {
            en: "Brake 2 calculated wheel slippage",
            sv: "Broms 2 beräknad hjulsläpp"
            }
        },
        // steering brakes
        accelSteering: {
            txt: {en: "Accelerometer steering",  sv: "Accelerometer styrning"},
            title: {
            en: "How much steeringbrake due to accelerometer sensing",
            sv: "Hur mycket styrbroms från accelerometern"
            }
        },
        wsSteering: {
            txt: {en: "Wheel brake steering", sv: "Hjulbroms styrning"},
            title: {
            en: "Wheel brake differential steering based of different sheel speed",
            sv: "Hjulbroms styrning baserat på olika hjulhatighet"
            }
        },
        // accelerometer
        accel: {
            txt: {en: "Accel. control axis", sv: "Accel. kontroll axel"},
            title: {
            en: "Accelerometer control axis value\nThe value form the axis used to steer brake",
            sv: "Accelerometer kontrol axel värde\nDet värde som används för att styrbromsa"
            }
        },
        accelX: {
            txt: {en: "Accelerometer X", sv: "Accelerometer X"},
            title: {
            en: "Accelerometer value for X-axis",
            sv: "Accelerometer värde för X-axeln"
            }
        },
        accelY: {
            txt: {en: "Accelerometer Y", sv: "Accelerometer Y"},
            title: {
            en: "Accelerometer value for Y-axis",
            sv: "Accelerometer värde för Y-axeln"
            }
        },
        accelZ: {
            txt: {en: "Accelerometer Z", sv: "Accelerometer Z"},
            title: {
            en: "Accelerometer value for Z-axis",
            sv: "Accelerometer värde för Z-axeln"
            }
        },

        // must be last of items from board, indicates end of log items
        log_end: {txt: {en: "Log end", sv: "Log slut"}},

        invalid: {
            txt:{en: "Invalid/test", sv: "Ogilltig/test"},
            title: {en: "Invalid, can be test header", sv: "Ogilltig, kan vara test rubrik"}
        },

        logIndex: {
            txt: {en: "index", sv: "index"},
            title: {
            en: "Index from session start, starts at 1 and counts upward for each logpoint",
            sv: "Index från sessions start, börjar räkna up från 1 varje logpunkt"
            }
        },

        // special
        log_coldStart: {
            txt: {en: "Start from reset", sv: "Uppstart från reset"},
            title: {
            en: "A special log point to mark a device restart.\nUse to find out when a new flying session started",
            sv: "En speciell log punkt för att markera en omstart.\nAnvänd för att se när en ny flygsession börjar"
            },
        },
    }

    static Types = {
        uninitialized: -1,

        // speed as in wheel revs / sec
        speedOnGround: 0,
        wheelRPS_0: 1,
        wheelRPS_1: 2,
        wheelRPS_2: 3,
        // brake force
        wantedBrakeForce: 4,
        calcBrakeForce: 5,
        brakeForce0_out: 6,
        brakeForce1_out: 7,
        brakeForce2_out: 8,
        // wheel slip
        slip0: 9,
        slip1: 10,
        slip2: 11,
        // steering brakes
        accelSteering: 12,
        wsSteering: 13,
        // accelerometer
        accel: 14,
        accelX: 15,
        accelY: 16,
        accelZ: 17,

        // must be last, indicates end of log items
        log_end: 18,
        // special
        log_coldStart: 0x3F,

        // only for testing purposes
        test_int32_1: 0x30,
        test_int32_2: 0x31,

        info: (type) => {
            let min = 0, max = 0, mid = 0, groups = [], bytes = 1;
            const t = ItemBase.Types;
            if (type >= t.speedOnGround && type <= t.wheelRPS_2) {
                max = 255;
                groups = [t.speedOnGround,t.wheelRPS_0,
                          t.wheelRPS_1,t.wheelRPS_2];
            } else if (type >= t.wantedBrakeForce && type <= t.brakeForce2_out) {
                max = 100;
                groups = [t.wantedBrakeForce,t.calcBrakeForce,
                          t.brakeForce0_out,t.brakeForce1_out,
                          t.brakeForce2_out];
            } else if (type >= t.slip0 && type <= t.slip2) {
                max = 100;
                groups = [t.slip0,t.slip2,t.slip2];
                bytes = 2;
            } else if (type >= t.accelSteering && type <= t.wsSteering) {
                min = -100; max = 100;
                groups = [t.slip0,t.slip2,t.slip2];
                bytes = 2;
            } else if (type >= t.accel && type <= t.accelZ) {
                max = 16.0; min = -16.0;
                groups = [t.slip0,t.slip2,t.slip2];
                bytes = 2;
            }
            return {min, max, mid, groups, bytes}
        }

    }

    static FloatTypes = [
        // are uint16_t
       // ItemBase.Types.slip0, ItemBase.Types.slip1, ItemBase.Types.slip2
    ];

    static Int8Types = [];

    static Int16Types = [
        ItemBase.Types.accelSteering, ItemBase.Types.wsSteering,
        ItemBase.Types.accelX, ItemBase.Types.accel,
        ItemBase.Types.accelY, ItemBase.Types.accelZ,
    ];

    static Int32Types = [
        ItemBase.Types.test_int32_1, ItemBase.Types.test_int32_2
    ];

    constructor({
        value = null,
        size = -1,
        type = ItemBase.Types.uninitialized,
        byteArray = [], startPos = 0
    }) {
        this.size = size
        this.type = type;

        if (byteArray.length) {
          this.restore(byteArray, startPos);
        } else {
          this.value = value;
        }
    }

    /**
     * @brief saves value to bytearray
     * @param byteArray = save to this buffer
     * @param startPos = at this pos
     * @returns number of bytes saved
     */
    save(byteArray, startPos) {
        // serialize Big Endian
        let pos = this.size + startPos;
        byteArray[--pos] = this.value & 0xFF;
        if (this.size > 1)
            byteArray[--pos] = (this.value & 0xFF00) >> 8;
        if (this.size > 2)
            byteArray[--pos] = (this.value & 0xFF0000) >> 16;
        if (this.size > 3)
            byteArray[--pos] = (this.value & 0xFF000000) >> 24;
        return this.size + pos - startPos;
    }

    restore(byteArray, startPos) {
        let vlu = 0;
        // read in Big Endian
        for (let i = this.size - 1; i > -1; --i)
          vlu |= (byteArray[i + startPos] << (8 * i));

        if (ItemBase.FloatTypes.indexOf(this.type) > -1) {
          // convert to float
          // inspired by http://cstl-csm.semo.edu/xzhang/Class%20Folder/CS280/Workbook_HTML/FLOATING_tut.htm
          // and https://en.wikipedia.org/wiki/Single-precision_floating-point_format
          let sign = ((vlu & 0x80000000) >> 31) ? -1 : 1;
          let exponent = ((vlu & 0x7F800000) >> 23) -127; // 0=127
          let mantissa = (vlu & 0x007FFFFF) | 0x00800000; // the 1 from the mantissa is always excluded
          vlu = sign * Math.pow(2, exponent) *  mantissa * Math.pow(2,-23);
          //console.log(vlu)

        } else if (ItemBase.Int8Types.indexOf(this.type) > -1) {
           if (vlu & 0x80) vlu = ((~vlu & 0xFF) +1) * -1;
        } else if (ItemBase.Int16Types.indexOf(this.type) > -1) {
           if (vlu & 0x8000) vlu = ((~vlu & 0xFFFF) + 1) * -1;
        } else if (ItemBase.Int32Types.indexOf(this.type) > -1) {
            // 32 bits is so big that the value implicitly goes negative on 32th bit
            //if (vlu & 0x80000000) vlu = (vlu & 0x7FFFFFFF) -1;
        }
        // set value
        this.setValue(vlu);
        // how many bytes we have read
        return this.size;
    }

    /**
     * @brief makes subclasses able to implement onChange events
     * @param {*} newValue
     */
    setValue(newValue) {
      this.value = newValue;
    }

    /**
     * @brief set the value from a user shown value
     * @param {*} newRealVlu value as shown to user
     */
    setRealValue(newRealVlu) {
        // clamp value
        const info = this.info();
        newRealVlu = Math.min(info.max, newRealVlu);
        newRealVlu = Math.max(info.min, newRealVlu);

        switch (this.type) {
        case ItemBase.Types.slip0:
        case ItemBase.Types.slip1:
        case ItemBase.Types.slip2:
            this.setValue(Math.round(newRealVlu));
            break;
        case ItemBase.Types.accel:
        case ItemBase.Types.accelX:
        case ItemBase.Types.accelY:
        case ItemBase.Types.accelZ:
            this.setValue(Math.round(newRealVlu * 512));
            break;
        case ItemBase.Types.speedOnGround:
        case ItemBase.Types.wheelRPS_0:
        case ItemBase.Types.wheelRPS_1:
        case ItemBase.Types.wheelRPS_2:
        case ItemBase.Types.wantedBrakeForce:
        case ItemBase.Types.calcBrakeForce:
        case ItemBase.Types.brakeForce0_out:
        case ItemBase.Types.brakeForce1_out:
        case ItemBase.Types.brakeForce2_out:
        case ItemBase.Types.accelSteering:
        case ItemBase.Types.wsSteering:
            this.setValue(Math.round(newRealVlu));
            break;
        default:
            this.setValue(newRealVlu);
        }
    }

    /**
     * @brief Gets the unit for this type
     * @returns string with correct postfix
     */
    unit() {
        return ItemBase.unitFor(this.type);
    }

    /**
     * @brief same as unit() but static
     * @param {Number} type
     * @returns string with correct postfix
     */
    static unitFor(type) {
        switch (type) {
        case ItemBase.Types.speedOnGround:
        case ItemBase.Types.wheelRPS_0:
        case ItemBase.Types.wheelRPS_1:
        case ItemBase.Types.wheelRPS_2:
            return "rps";
        case ItemBase.Types.wantedBrakeForce:
        case ItemBase.Types.calcBrakeForce:
        case ItemBase.Types.brakeForce0_out:
        case ItemBase.Types.brakeForce1_out:
        case ItemBase.Types.brakeForce2_out:
        case ItemBase.Types.accelSteering:
        case ItemBase.Types.wsSteering:
        case ItemBase.Types.slip0:
        case ItemBase.Types.slip1:
        case ItemBase.Types.slip2:
            return "%";
        case ItemBase.Types.accel:
        case ItemBase.Types.accelX:
        case ItemBase.Types.accelY:
        case ItemBase.Types.accelZ:
            return "G";
        default:
            return "";
        }
    }

    /**
     * @brief returns rounded and converted value
     *         if applicable
     * @returns value based based of type
     */
    realVlu() {
        switch (this.type) {
        case ItemBase.Types.slip0:
        case ItemBase.Types.slip1:
        case ItemBase.Types.slip2:
            return Math.round(this.value*1000)/1000;
        case ItemBase.Types.accel:
        case ItemBase.Types.accelX:
        case ItemBase.Types.accelY:
        case ItemBase.Types.accelZ:
            return Math.round((this.value / 512)*100)/100;
        case ItemBase.Types.speedOnGround:
        case ItemBase.Types.wheelRPS_0:
        case ItemBase.Types.wheelRPS_1:
        case ItemBase.Types.wheelRPS_2:
        case ItemBase.Types.wantedBrakeForce:
        case ItemBase.Types.calcBrakeForce:
        case ItemBase.Types.brakeForce0_out:
        case ItemBase.Types.brakeForce1_out:
        case ItemBase.Types.brakeForce2_out:
        case ItemBase.Types.accelSteering:
        case ItemBase.Types.wsSteering:
            return Math.round(this.value *100) / 100;
        default:
            return this.value;
        }
    }

    translatedType(lang = document.documentElement.lang) {
        const keys = Object.keys(ItemBase.TypesTranslated).slice(1);
        const tr = ItemBase.TypesTranslated[keys[this.type]] ||
                     ItemBase.TypesTranslated.invalid;
        return {txt: tr.txt[lang], title: tr.title[lang]};
    }

    info() {
        return ItemBase.Types.info(this.type);
    }
}
