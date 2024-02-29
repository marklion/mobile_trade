*** Settings ***
Resource  ../api_base.resource
Resource  ../database.resource
Resource  rbac_curd.resource

Suite Setup  Run Keywords  RBAC reset  AND  Company Reset
Suite Teardown  Run Keywords  RBAC reset  AND  Company Reset

*** Test Cases ***
Single Add Company
    [Teardown]  Company Reset
    ${add_req}  Create Dictionary  name=test_company
    Req to Server  /rbac/company_add  ABCD  ${add_req}
    ${found}  Search A Company By Name  test_company
    Should Not Be Empty  ${found}
    Has Module In Bound Modules  ${found}[bound_modules]  customer
    Has Module In Bound Modules  ${found}[bound_modules]  config  True

Lots of Company
    [Teardown]  Company Reset
    FOR  ${itr}  IN RANGE  19
        ${add_req}  Create Dictionary  name=test_company_${itr}
        Req to Server  /rbac/company_add  ABCD  ${add_req}
    END
    FOR  ${itr_index}  IN RANGE  19
        ${found}  Search A Company By Name  test_company_${itr_index}
        Should Not Be Empty  ${found}
    END

Del Company
    [Teardown]  Company Reset
    ${add_req}  Create Dictionary  name=test_company
    Req to Server  /rbac/company_add  ABCD  ${add_req}
    ${found}  Search A Company By Name  test_company
    ${del_req}  Create Dictionary  id=${found}[id]
    Req to Server  /rbac/company_del  ABCD  ${del_req}
    ${found}  Search A Company By Name  test_company
    Should Be Empty  ${found}

Reg New Admin
    [Setup]  RBAC reset
    [Teardown]  RBAC reset
    ${ran_com}  Create Several Company And Pick One
    Reg Company Admin  ${ran_com}[id]  19911991199
    ${ran_com}  Search A Company By Name  ${ran_com}[name]
    Has Module In Bound Modules  ${ran_com}[bound_modules]  config
    Has Module In Bound Modules  ${ran_com}[bound_modules]  customer  True
    ${token}  User Login With Phone  19911991199
    Should Not Be Empty  ${token}




