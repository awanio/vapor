//go:build linux
// +build linux

package auth

/*
#cgo LDFLAGS: -lpam -lpam_misc
#include <security/pam_appl.h>
#include <stdlib.h>
#include <string.h>

int pam_conv_func(int num_msg, const struct pam_message **msg,
                  struct pam_response **resp, void *appdata_ptr) {
    struct pam_response *responses = NULL;
    if (num_msg <= 0 || num_msg > PAM_MAX_NUM_MSG) {
        return PAM_CONV_ERR;
    }
    
    responses = calloc(num_msg, sizeof(struct pam_response));
    if (!responses) {
        return PAM_BUF_ERR;
    }
    
    char *password = (char *)appdata_ptr;
    for (int i = 0; i < num_msg; i++) {
        responses[i].resp_retcode = 0;
        switch (msg[i]->msg_style) {
        case PAM_PROMPT_ECHO_OFF:
            responses[i].resp = strdup(password);
            if (!responses[i].resp) {
                for (int j = 0; j < i; j++) {
                    free(responses[j].resp);
                }
                free(responses);
                return PAM_BUF_ERR;
            }
            break;
        case PAM_PROMPT_ECHO_ON:
        case PAM_ERROR_MSG:
        case PAM_TEXT_INFO:
            responses[i].resp = NULL;
            break;
        default:
            for (int j = 0; j <= i; j++) {
                if (responses[j].resp) {
                    free(responses[j].resp);
                }
            }
            free(responses);
            return PAM_CONV_ERR;
        }
    }
    
    *resp = responses;
    return PAM_SUCCESS;
}

int authenticate_user(const char *username, const char *password) {
    pam_handle_t *pamh = NULL;
    int retval;
    struct pam_conv conv = {
        pam_conv_func,
        (void *)password
    };
    
    retval = pam_start("system-auth", username, &conv, &pamh);
    if (retval != PAM_SUCCESS) {
        return retval;
    }
    
    retval = pam_authenticate(pamh, PAM_SILENT | PAM_DISALLOW_NULL_AUTHTOK);
    if (retval != PAM_SUCCESS) {
        pam_end(pamh, retval);
        return retval;
    }
    
    retval = pam_acct_mgmt(pamh, PAM_SILENT | PAM_DISALLOW_NULL_AUTHTOK);
    pam_end(pamh, retval);
    
    return retval;
}
*/
import "C"
import (
	"unsafe"
)

// authenticateLinuxUser validates a user against the Linux system using PAM
func authenticateLinuxUser(username, password string) bool {
	cUsername := C.CString(username)
	cPassword := C.CString(password)
	defer C.free(unsafe.Pointer(cUsername))
	defer C.free(unsafe.Pointer(cPassword))
	
	retval := C.authenticate_user(cUsername, cPassword)
	return retval == C.PAM_SUCCESS
}
