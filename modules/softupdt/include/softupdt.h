/* -*- Mode: C; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 *
 * The contents of this file are subject to the Netscape Public License
 * Version 1.0 (the "NPL"); you may not use this file except in
 * compliance with the NPL.  You may obtain a copy of the NPL at
 * http://www.mozilla.org/NPL/
 *
 * Software distributed under the NPL is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the NPL
 * for the specific language governing rights and limitations under the
 * NPL.
 *
 * The Initial Developer of this code under the NPL is Netscape
 * Communications Corporation.  Portions created by Netscape are
 * Copyright (C) 1998 Netscape Communications Corporation.  All Rights
 * Reserved.
 */
#include "structs.h"

/* Public */
typedef void (*SoftUpdateCompletionFunction) (int result, void * closure);

#ifdef XP_WIN16
extern XP_Bool	utilityScheduled = FALSE;
#endif

XP_BEGIN_PROTOS

/* Flags for start software update */
/* See trigger.java for docs */
#define FORCE_INSTALL 1
#define SILENT_INSTALL 2

/* Initialize Software Update */
extern int SU_Startup(void);

/* Cleanup Software Update */
extern int SU_Shutdown(void);

/* StartSoftwareUpdate
 * performs the update, and calls the callback function with the 
 */
extern XP_Bool SU_StartSoftwareUpdate(MWContext * context, 
						const char * url, 
						const char * name, 
						SoftUpdateCompletionFunction f,
						void * completionClosure,
                        int32 flags); /* FORCE_INSTALL, SILENT_INSTALL */

/* SU_NewStream
 * Stream decoder for software updates
 */	
extern NET_StreamClass * SU_NewStream (int format_out, void * registration,
                                       URL_Struct * request, MWContext *context);

extern int32 SU_PatchFile( char* srcfile, XP_FileType srctype,
                           char* patchfile, XP_FileType patchtype,
                           char* targfile, XP_FileType targtype );

extern int32 SU_Uninstall(char *regPackageName);

/* This method enumerates through the packages which can be uninstalled 
* by finding the packages in the shared uninstall list and the packages 
* in the current communicator uninstall list. 
* When SU_EnumUninstall is first called, *context should be null. Context
* keeps track of which list we are traversing, either shared or the current
* communicator list. If we are able to enumerate all packages without any 
* errors, context is freed in the routine, otherwise you must XP_FREE it yourself.
* packageName - user readable package name (if this is blank you could use
*               regPackageName as a substitute).
* len1 - sizeof(packageName)
* regPackageName - name of package name installed. This name is unique
*                  and is what should be passed to SU_Uninstall()
* len2 - sizeof(regPackageName)
*/
extern int32 SU_EnumUninstall(void** context, char* packageName,
                              int32 len1, char*regPackageName, int32 len2);

#ifdef XP_UNIX
    #define AUTOUPDATE_ENABLE_PREF     "autoupdate.enabled_on_unix"
#else
    #define AUTOUPDATE_ENABLE_PREF     "autoupdate.enabled"
#endif

#define AUTOUPDATE_CONFIRM_PREF    "autoupdate.confirm_install"
#define CHARSET_HEADER             "Charset"
#define CONTENT_ENCODING_HEADER    "Content-encoding"
#define INSTALLER_HEADER           "Install-Script"
#define MOCHA_CONTEXT_PREFIX       "autoinstall:"
#define REG_SOFTUPDT_DIR           "Netscape/Communicator/SoftwareUpdate/"
#define LAST_REGPACK_TIME          "LastRegPackTime"

/* error codes */
#define su_ErrInvalidArgs          -1
#define su_ErrUnknownInstaller     -2
#define su_ErrInternalError        -3
#define su_ErrBadScript            -4
#define su_JarError                -5
#define su_DiskSpaceError          -6
XP_END_PROTOS
