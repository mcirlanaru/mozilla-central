# The contents of this file are subject to the Netscape Public License
# Version 1.0 (the "NPL"); you may not use this file except in
# compliance with the NPL.  You may obtain a copy of the NPL at
# http://www.mozilla.org/NPL/
#
# Software distributed under the NPL is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the NPL
# for the specific language governing rights and limitations under the
# NPL.
#
# The Initial Developer of this code under the NPL is Netscape
# Communications Corporation.  Portions created by Netscape are
# Copyright (C) 1998 Netscape Communications Corporation.  All Rights
# Reserved.

#
# Config stuff for ReliantUNIX
#

include $(GDEPTH)/gconfig/UNIX.mk

DEFAULT_COMPILER = cc

ifdef NS_USE_GCC
	## gcc-2.7.2 homebrewn
	CC          = gcc
	CCC         = g++
	AS          = $(CC)
	ASFLAGS     += -x assembler-with-cpp
	LD          = gld
	ODD_CFLAGS  = -pipe -Wall -Wno-format
	ifdef BUILD_OPT
		OPTIMIZER += -O6
	endif
	MKSHLIB     = $(LD)
	MKSHLIB    += -G -h $(@:$(OBJDIR)/%.so=%.so)
	DSO_LDOPTS += -G -Xlinker -Blargedynsym
else
	## native compiler (CDS++ 1.0)
#	CC   = /usr/bin/cc
	CC   = cc
	CCC  = /usr/bin/CC
	AS   = /usr/bin/cc
	ODD_CFLAGS  = 
	ifdef BUILD_OPT
		OPTIMIZER += -O -F Olimit,4000
	endif
	MKSHLIB     = $(CC)
	MKSHLIB    += -G -h $(@:$(OBJDIR)/%.so=%.so)
	DSO_LDOPTS += -G -W l,-Blargedynsym
endif

NOSUCHFILE  = /sni-rm-f-sucks
ODD_CFLAGS += -DSVR4 -DSNI -DRELIANTUNIX
CPU_ARCH    = mips
RANLIB      = /bin/true

# For purify
NOMD_OS_CFLAGS += $(ODD_CFLAGS)

# we do not have -MDupdate ...
OS_CFLAGS   += $(NOMD_OS_CFLAGS)
OS_LIBS     += -lsocket -lnsl -lresolv -lgen -ldl -lc /usr/ucblib/libucb.a
HAVE_PURIFY  = 0

ifdef DSO_BACKEND
	DSO_LDOPTS += -h $(DSO_NAME)
endif
