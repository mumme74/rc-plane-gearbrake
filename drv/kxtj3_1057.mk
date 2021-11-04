# List of all the LSM303DLHC device files.
KXTJ3_1057CSRC := $(DRVDIR)/kxtj3_1057.c

# Required include directories
KXTJ3_1057HCINC := $(CHIBIOS)/os/ex/include \
                 $(DRVDIR)/

# Shared variables
ALLCSRC += $(KXTJ3_1057CSRC)
ALLINC  += $(KXTJ3_1057HCINC)