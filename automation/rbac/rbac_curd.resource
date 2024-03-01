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
    FOR  ${itr}  IN RANGE  11
        ${add_req}  Create Dictionary  name=test_company_${itr}
        Req to Server  /rbac/company_add  ABCD  ${add_req}
    END
    ${ran_no}  Evaluate  random.randint(0, 10)
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

Get Self Module By Name
    [Arguments]  ${token}  ${module_name}
    ${modules}  Req Get to Server  /rbac/module_get_all  ${token}  all_module
    ${module_added}  Set Variable  ${null}
    FOR  ${itr}  IN  @{modules}
        ${itr_name}  Get From Dictionary  ${itr}  name
        IF  $itr_name == $module_name
            ${module_added}  Set Variable  ${itr}
        END
    END
    RETURN  ${module_added}

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

Bind Role To Module
    [Arguments]  ${token}  ${role_name}  ${module_name}
    ${role_added}  Get Role By Name  ${token}  ${role_name}
    ${module_found}  Get Self Module By Name  ${token}  ${module_name}
    ${bind_req}  Create Dictionary  role_id=${role_added}[id]  module_id=${module_found}[id]
    ${resp}  Req to Server  /rbac/bind_module2role  ${token}  ${bind_req}
    Should Be True  ${resp}[result]

Unbind Role from Module
    [Arguments]  ${token}  ${role_name}  ${module_name}
    ${role_added}  Get Role By Name  ${token}  ${role_name}
    ${module_added}  Get Self Module By Name  ${token}  ${module_name}
    ${req}  Create Dictionary  role_id=${role_added}[id]  module_id=${module_added}[id]
    ${resp}  Req to Server  /rbac/unbind_module2role  ${token}  ${req}
    Should Be True  ${resp}[result]

Bind Role To User
    [Arguments]  ${token}  ${role_name}  ${phone}
    ${role_added}  Get Role By Name  ${token}  ${role_name}
    ${req}  Create Dictionary  role_id=${role_added}[id]  phone=${phone}
    ${resp}  Req to Server  /rbac/bind_role2user  ${token}  ${req}
    Should Be True  ${resp}[result]

Unbind Role From User
    [Arguments]  ${token}  ${role_name}  ${phone}
    ${role_added}  Get Role By Name  ${token}  ${role_name}
    ${req}  Create Dictionary  role_id=${role_added}[id]  phone=${phone}
    ${resp}  Req to Server  /rbac/unbind_role2user  ${token}  ${req}
    Should Be True  ${resp}[result]

New User Login
    [Arguments]  ${phone}  ${company_name}  ${open_id}
    ${req}  Create Dictionary  phone=${phone}  company_name=${company_name}  open_id=${open_id}
    ${resp}  Req to Server  /rbac/fetch_user  ABCDDD  ${req}
    ${token}  User Login With Phone  ${phone}
    RETURN  ${token}

Add Module To User
    [Arguments]  ${token}  ${phone}  ${module_name}  ${read_only}=${False}
    FOR  ${itr}  IN RANGE  4
        IF  $itr == 0 or $itr == 1
            Add Role  ${token}  role_name_${itr}  ${True}
        ELSE
            Add Role  ${token}  role_name_${itr}
        END
    END
    ${ran_role}  Evaluate  random.randint(2, 3)
    IF  $read_only
        ${ran_role}  Evaluate  random.randint(0, 1)
    END
    ${role_added}  Get Role By Name  ${token}  role_name_${ran_role}
    Bind Role To Module  ${token}  ${role_added}[name]  ${module_name}
    Bind Role To User  ${token}  ${role_added}[name]  ${phone}

Add Module To Company
    [Arguments]  ${company_id}  ${module_name}
    ${module_added}  Get Self Module By Name  ABCD  ${module_name}
    ${req}  Create Dictionary  company_id=${company_id}  module_id=${module_added}[id]
    ${resp}  Req to Server  /rbac/company_add_module  ABCD  ${req}
    Should Be True  ${resp}[result]

Del Module from Company
    [Arguments]  ${company_id}  ${module_name}
    ${module_added}  Get Self Module By Name  ABCD  ${module_name}
    ${req}  Create Dictionary  company_id=${company_id}  module_id=${module_added}[id]
    ${resp}  Req to Server  /rbac/company_del_module  ABCD  ${req}
    Should Be True  ${resp}[result]

Get Self User
    [Arguments]  ${token}
    ${req}  Create Dictionary
    ${resp}  Req to Server  /rbac/user_get_self  ${token}  ${req}
    RETURN  ${resp}