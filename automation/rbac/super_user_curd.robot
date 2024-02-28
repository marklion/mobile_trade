*** Settings ***
Resource  ../api_base.resource
Resource  ../database.resource
Resource  rbac_curd.resource

*** Test Cases ***
Single Add Company
    Clear Table  company
    ${add_req}  Create Dictionary  name=test_company
    Req to Server  /rbac/company_add  ABCD  ${add_req}
    ${found}  Search A Company By Name  test_company
    Should Not Be Empty  ${found}
Lots of Company
    Clear Table  company
    FOR  ${itr}  IN RANGE  81
        ${add_req}  Create Dictionary  name=test_company_${itr}
        Req to Server  /rbac/company_add  ABCD  ${add_req}
    END
    FOR  ${itr_index}  IN RANGE  81
        ${found}  Search A Company By Name  test_company_${itr_index}
        Should Not Be Empty  ${found}
    END

Del Company
    Clear Table  company
    ${add_req}  Create Dictionary  name=test_company
    Req to Server  /rbac/company_add  ABCD  ${add_req}
    ${found}  Search A Company By Name  test_company
    ${del_req}  Create Dictionary  id=${found}[id]
    Req to Server  /rbac/company_del  ABCD  ${del_req}
    ${found}  Search A Company By Name  test_company
    Should Be Empty  ${found}

Reg New Admin
    Clear Non-Admin User
    ${ran_com_id}  Create Several Company And Pick One
    Reg Company Admin  ${ran_com_id}  19911991199
    ${token}  User Login With Phone  19911991199
    Should Not Be Empty  ${token}

Company Scope Role Add
    ${ran_com_id}  Create Several Company And Pick One
    ${token}  Login As Admin Of Company  ${ran_com_id}
    ${add_req1}  Create Dictionary  name=role1  description=role1_desc  is_readonly=${False}
    ${add_req2}  Create Dictionary  name=role2  description=role2_desc  is_readonly=${False}
    ${resp}  Req to Server  /rbac/role_add  ${token}  ${add_req1}
    ${resp}  Req to Server  /rbac/role_add  ${token}  ${add_req2}


*** Keywords ***
Create Several Company And Pick One
    FOR  ${itr}  IN RANGE  40
        ${add_req}  Create Dictionary  name=test_company_${itr}
        Req to Server  /rbac/company_add  ABCD  ${add_req}
    END
    ${ran_no}  Evaluate  random.randint(0, 40)
    ${found}  Search A Company By Name  test_company_${ran_no}
    RETURN  ${found}[id]

