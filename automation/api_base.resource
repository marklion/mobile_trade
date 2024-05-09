*** Settings ***
Library  RequestsLibrary
Library  Collections
Resource  var.resource

*** Variables ***
${remote_url}    http://localhost:44510/api/v1


*** Keywords ***
No Permission Req to Server
    [Arguments]  ${url}  ${token}  ${body}
    ${real_url}  Set Variable  ${remote_url}${url}
    IF  $server_base != ''
        ${real_url}  Set Variable  ${server_base}${url}
    END
    ${headers}  Create Dictionary  token=${token}
    ${resp}  POST  url=${real_url}  headers=${headers}  json=${body}
    Should Not Be Empty  ${resp.json()}[err_msg]
    Should Contain  ${resp.json()}[err_msg]  权限

Req to Server
    [Arguments]  ${url}  ${token}  ${body}  ${exception}=${False}
    ${real_url}  Set Variable  ${remote_url}${url}
    IF  $server_base != ''
        ${real_url}  Set Variable  ${server_base}${url}
    END
    ${real_token}  Set Variable  ${token}
    IF  $token == 'admin_token'
        ${req}  Create Dictionary  phone=18911992582  password=Mobile_P@ssw0rd_Trade
        ${resp}  Req to Server  /global/pwd_login  AAAAAAAA  ${req}
        ${real_token}  Set Variable  ${resp}[token]
    END
    ${headers}  Create Dictionary  token=${real_token}
    ${resp}  POST  url=${real_url}  headers=${headers}  json=${body}
    Log  ${resp.json()}
    IF  $exception
        Should Not Be Empty  ${resp.json()}[err_msg]
        RETURN  ${resp.json()}[err_msg]
    ELSE
        Should Be Empty  ${resp.json()}[err_msg]
        RETURN  ${resp.json()}[result]
    END

Req Get to Server
    [Arguments]  ${url}  ${token}  ${key_name}  ${page}=${-1}  &{body}
    ${cur_page_no}  Set Variable  ${0}
    @{ret}  Create List
    WHILE  True
        Set To Dictionary  ${body}  pageNo=${cur_page_no}
        ${get_resp}  Req to Server  ${url}  ${token}  ${body}
        ${ret_len}  Get Length  ${get_resp}[${key_name}]
        IF  ${ret_len} == 0
            Exit For Loop
        ELSE
            ${cur_page_no}  Evaluate  ${cur_page_no} + 1
            ${ret}  Combine Lists  ${ret}  ${get_resp}[${key_name}]
        END
        Exit For Loop If  ${cur_page_no} > ${page} and ${page} != -1
    END
    Log  ${ret}
    RETURN  ${ret}

Verify Module Permission
    [Arguments]  ${token}  ${module_name}  ${cannot}=${False}  ${just_read}=${False}
    ${url_read}  Set Variable  /rbac/verify_${module_name}_read
    ${url_write}  Set Variable  /rbac/verify_${module_name}_write
    ${req}  Create Dictionary
    IF  $cannot
        No Permission Req to Server  ${url_read}  ${token}  ${req}
        No Permission Req to Server  ${url_write}  ${token}  ${req}
    ELSE
        Req to Server  ${url_read}  ${token}  ${req}
        IF  $just_read is False
            Req to Server  ${url_write}  ${token}  ${req}
        END
    END

