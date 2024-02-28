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

Search A Company By Name
    [Arguments]  ${name}
    @{cur_companys}  Get All Company
    ${found_content}  Create Dictionary
    FOR  ${itr}  IN  @{cur_companys}
        ${itr_name}  Get From Dictionary  ${itr}  name
        IF  $itr_name == $name
        ${found_content}  Set Variable  ${itr}
            Exit For Loop
        END
    END
    RETURN  ${found_content}

Reg Company Admin
    [Arguments]  ${company_id}  ${phone}
    ${req}  Create Dictionary  company_id=${company_id}  phone=${phone}
    ${resp}  Req to Server  /rbac/reg_company_admin  ABCD  ${req}
    Should Be True  ${resp}[result]

User Login With Phone
    [Arguments]  ${phone}
    ${req}  Create Dictionary  phone=${phone}
    ${resp}  Req to Server  /rbac/login  AAAAAAAA  ${req}
    RETURN  ${resp}[token]

Login As Admin Of Company
    [Arguments]  ${company_id}
    ${admin}  Reg Company Admin  ${company_id}  12345678901
    ${token}  User Login With Phone  12345678901
    RETURN  ${token}
