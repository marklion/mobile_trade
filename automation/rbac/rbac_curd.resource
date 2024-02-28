*** Settings ***
Resource  ../api_base.resource
Library  Collections

*** Keywords ***
Get All Company
    ${cur_page_no}  Set Variable  ${0}
    @{ret}  Create List
    WHILE  True
        ${req}  Create Dictionary  pageNo=${cur_page_no}
        ${companys_ret}  Req to Server  /rbac/company_get_all  ABCD  ${req}
        ${ret_len}  Get Length  ${companys_ret}[all_company]
        IF  ${ret_len} == 0
            Exit For Loop
        ELSE
            ${cur_page_no}  Evaluate  ${cur_page_no} + 1
            ${ret}  Combine Lists  ${ret}  ${companys_ret}[all_company]
        END
    END
    RETURN  ${ret}