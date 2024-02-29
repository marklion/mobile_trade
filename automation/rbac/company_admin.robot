*** Settings ***
Resource  ../api_base.resource
Resource  ../database.resource
Resource  rbac_curd.resource

Suite Setup  Run Keywords  RBAC reset  AND  Company Reset
Suite Teardown  Run Keywords  RBAC reset  AND  Company Reset

*** Test Cases ***
Company Scope Role Add
    [Setup]  RBAC reset
    [Teardown]  RBAC reset
    ${ran_com}  Create Several Company And Pick One
    ${token}  Login As Admin Of Company  ${ran_com}[id]
    Add Role  ${token}  role1
    Add Role  ${token}  role2
    @{all_roles}  Get All Roles  token=${token}
    Length Should Be  ${all_roles}  3

Bind Module To Role
    [Setup]  RBAC reset
    [Teardown]  RBAC reset
    ${ran_com}  Create Several Company And Pick One
    ${token}  Login As Admin Of Company  ${ran_com}[id]
    Add Role  ${token}  nr
    ${role_added}  Get Role By Name  ${token}  nr
    @{moduels}  Get Self Module  ${token}
    Should Not Be Empty  @{moduels}
    FOR  ${itr}  IN  @{moduels}
        ${bind_req}  Create Dictionary  role_id=${role_added}[id]  module_id=${itr}[id]
        ${resp}  Req to Server  /rbac/bind_module2role  ${token}  ${bind_req}
    END
    ${role_added}  Get Role By Name  ${token}  nr
    FOR  ${itr}  IN  @{role_added}[related_modules]
        Should Be True  ${itr} in @{moduels}
    END

