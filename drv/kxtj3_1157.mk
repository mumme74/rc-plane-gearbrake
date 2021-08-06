# List of all the LSM303DLHC device files.
KXTJ3_1157CSRC := $(DRVDIR)/kxtj3_1157.c

# Required include directories
KXTJ3_1157HCINC := $(CHIBIOS)/os/ex/include \
                 $(DRVDIR)/

# Shared variables
ALLCSRC += $(KXTJ3_1157CSRC)
ALLINC  += $(KXTJ3_1157HCINC)