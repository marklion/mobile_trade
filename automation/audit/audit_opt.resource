*** Settings ***
Resource  ../stuff/stuff_opt.resource

*** Keywords ***
Prepare Audit Environment
    Prepare Sale and Buy

Cleanup Audit Environment
    Cleanup Sale and Buy
    Clear Audit Config

Add Audit Config
    [Arguments]  ${url}  ${role_name}=公司管理员  ${token}=${sc_admin_token}
    ${role}  Get Role By Name    ${token}    ${role_name}
    ${req}  Create Dictionary    role_id=${role}[id]    url=${url}
    Req to Server    /audit/add_audit_config    ${token}    ${req}

Del Audit Config
    [Arguments]  ${url}  ${token}=${sc_admin_token}
    ${resp}  Req Get to Server    /audit/get_audit_configs    ${token}    configs
    FOR  ${config}  IN  @{resp}
        ${tmp_url}  Get From Dictionary    ${config}    url  abc
        IF  $tmp_url == $url
            ${config_id}=    Set Variable    ${config}[id]
            ${req}  Create Dictionary    id=${config_id}
            Req to Server    /audit/del_audit_config    ${token}    ${req}
        END
    END

Clear Audit Config
    Audit Reset