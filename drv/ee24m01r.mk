# List of all the LSM303DLHC device files.
EE24M01R_CSRC := $(DRVDIR)/ee24m01r.c

# Required include directories
EE24M01R_HCINC := $(CHIBIOS)/os/ex/include \
                 $(DRVDIR)/

# Shared variables
ALLCSRC += $(EE24M01R_CSRC)
ALLINC  += $(EE24M01R_HCINC)
