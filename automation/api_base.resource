*** Settings ***
Library  RequestsLibrary
Library  Collections

*** Variables ***
${remote_url}  http://localhost:44510/api/v1

*** Keywords ***
Req to Server
    [Arguments]  ${url}  ${token}  ${body}
    ${real_url}  Set Variable  ${remote_url}${url}
    ${headers}  Create Dictionary  token=${token}
    ${resp}  POST  url=${real_url}  headers=${headers}  json=${body}
    Should Be Empty  ${resp.json()}[err_msg]
    RETURN  ${resp.json()}[result]

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
    RETURN  ${ret}