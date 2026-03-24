*** Settings ***
Resource  ../api_base.resource
Resource  ../database.resource
Resource  ../rbac/rbac_curd.resource

*** Keywords ***
Group Suite Reset
    Run Keywords  Group Tables Reset  AND  RBAC reset  AND  Company Reset

Convert To Group By Super Admin
    [Arguments]  ${company_id}  ${admin_user_id}
    ${req}  Create Dictionary  company_id=${company_id}  admin_user_id=${admin_user_id}
    ${ret}  Req to Server  /global/company_convert_to_group  admin_token  ${req}
    Should Be True  ${ret}[result]

Get Self Info
    [Arguments]  ${token}
    ${empty}  Create Dictionary
    ${ret}  Req to Server  /global/self_info  ${token}  ${empty}
    RETURN  ${ret}
