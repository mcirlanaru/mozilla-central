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
# Config stuff for FreeBSD2
#

include $(GDEPTH)/gconfig/UNIX.mk

DEFAULT_COMPILER	= gcc
CC			= gcc
CCC			= g++
RANLIB			= ranlib

OS_REL_CFLAGS		= -mno-486 -Di386
CPU_ARCH		= x86

OS_CFLAGS		= $(DSO_CFLAGS) $(OS_REL_CFLAGS) -ansi -Wall -pipe -DFREEBSD -DHAVE_STRERROR -DHAVE_BSD_FLOCK

ifdef USE_PTHREADS
	OS_LIBS		= -lc_r
	DEFINES		+= -D_PR_NEED_FAKE_POLL
else
	OS_LIBS		= -lc
endif

ARCH			= freebsd

DSO_CFLAGS		= -fPIC
DSO_LDOPTS		= -Bshareable
DSO_LDFLAGS		=

MKSHLIB			= $(LD) $(DSO_LDOPTS)

G++INCLUDES		= -I/usr/include/g++

INCLUDES		+= -I/usr/X11R6/include
