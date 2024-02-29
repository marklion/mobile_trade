*** Settings ***
Resource  ../api_base.resource

*** Keywords ***
Get All Company
    ${ret}  Req Get to Server  /rbac/company_get_all  ABCD  all_company
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
Create Several Company And Pick One
    FOR  ${itr}  IN RANGE  40
        ${add_req}  Create Dictionary  name=test_company_${itr}
        Req to Server  /rbac/company_add  ABCD  ${add_req}
    END
    ${ran_no}  Evaluate  random.randint(0, 40)
    ${found}  Search A Company By Name  test_company_${ran_no}
    RETURN  ${found}

Has Module In Bound Modules
    [Arguments]  ${bound_modules}  ${module_name}  ${not_in}=False
    ${ret}  Set Variable  False
    FOR  ${itr}  IN  @{bound_modules}
        ${itr_name}  Get From Dictionary  ${itr}  name
        IF  $itr_name == $module_name
            ${ret}  Set Variable  True
            Exit For Loop
        END
    END
    Should Not Be Equal  ${ret}  ${not_in}

Add Role
    [Arguments]  ${token}  ${role_name}  ${is_readonly}=${False}
    ${add_req1}  Create Dictionary  name=${role_name}  description=${role_name}_desc  is_readonly=${is_readonly}
    ${resp}  Req to Server  /rbac/role_add  ${token}  ${add_req1}
    Should Be True  ${resp}[result]

Get Self Module
    [Arguments]  ${token}
    ${modules}  Req Get to Server  /rbac/module_get_all  ${token}  all_module
    RETURN  ${modules}

Get All Roles
    [Arguments]  ${token}
    ${resp}  Req Get to Server  /rbac/role_get_all  ${token}  all_role
    RETURN  ${resp}

Get Role By Name
    [Arguments]  ${token}  ${role_name}
    @{all_roles}  Get All Roles  ${token}
    FOR  ${itr}  IN  @{all_roles}
        ${itr_name}  Get From Dictionary  ${itr}  name
        IF  $itr_name == $role_name
            RETURN  ${itr}
        END
    END

