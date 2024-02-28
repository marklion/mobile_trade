*** Settings ***
Library  Process
Library  RequestsLibrary

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