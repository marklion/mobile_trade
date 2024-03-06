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

Bind Avalible Module To Role
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

Unbind One Module From Role
    [Setup]  RBAC reset
    [Teardown]  RBAC reset
    ${ran_com}  Create Several Company And Pick One
    ${token}  Login As Admin Of Company  ${ran_com}[id]
    Add Role  ${token}  role1
    Bind Role To Module  ${token}  role1  config
    ${role_added}  Get Role By Name  ${token}  role1
    @{role_modules}  Create List
    FOR  ${itr}  IN  @{role_added}[related_modules]
        Append To List  ${role_modules}  ${itr}[name]
    END
    Should Contain  ${role_modules}  config
    Unbind Role from Module  ${token}  role1  config
    ${role_added}  Get Role By Name  ${token}  role1
    @{role_modules}  Create List
    FOR  ${itr}  IN  @{role_added}[related_modules]
        Append To List  ${role_modules}  ${itr}[name]
    END
    Should Not Contain  ${role_modules}  config

Bind And Check Role To User
    [Setup]  RBAC reset
    [Teardown]  RBAC reset
    ${ran_com}  Create Several Company And Pick One
    New User Login  1331  ${ran_com}[name]  11111122222
    ${token}  Login As Admin Of Company  ${ran_com}[id]
    ${new_role}  Add Role  ${token}  role1
    Bind Role To User  ${token}  role1  1331
    ${role_added}  Get Role By Name  ${token}  role1
    @{user_included}  Create List
    FOR  ${itr}  IN  @{role_added}[related_users]
        Append To List  ${user_included}  ${itr}[phone]
    END
    Should Contain  ${user_included}  1331

Unbind And Check Role From User
    [Setup]  RBAC reset
    [Teardown]  RBAC reset
    ${ran_com}  Create Several Company And Pick One
    New User Login  1331  ${ran_com}[name]  11111122222
    ${token}  Login As Admin Of Company  ${ran_com}[id]
    ${new_role}  Add Role  ${token}  role1
    Bind Role To User  ${token}  role1  1331
    Unbind Role From User  ${token}  role1  1331
    ${role_added}  Get Role By Name  ${token}  role1
    @{user_included}  Create List
    FOR  ${itr}  IN  @{role_added}[related_users]
        Append To List  ${user_included}  ${itr}[phone]
    END
    Should Not Contain  ${user_included}  1331

Saler Verify RBAC Api
    [Setup]  RBAC reset
    [Teardown]  RBAC reset
    ${test_user_phone}  Set Variable  123456
    ${ran_com}  Create Several Company And Pick One
    Add Module To Company  ${ran_com}[id]  plan
    Add Module To Company  ${ran_com}[id]  cash
    Add Module To Company  ${ran_com}[id]  scale
    Add Module To Company  ${ran_com}[id]  bid
    Add Module To Company  ${ran_com}[id]  buy
    Add Module To Company  ${ran_com}[id]  stuff
    ${token}  Login As Admin Of Company  ${ran_com}[id]
    New User Login  ${test_user_phone}  ${ran_com}[name]  11111122222
    Add Module To User  ${token}  ${test_user_phone}  plan
    Add Module To User  ${token}  ${test_user_phone}  cash  ${True}
    Add Module To User  ${token}  ${test_user_phone}  scale
    Add Module To User  ${token}  ${test_user_phone}  stuff
    ${test_token}  User Login With Phone  ${test_user_phone}
    Verify Module Permission  ${test_token}  plan
    Verify Module Permission  ${test_token}  cash  ${False}  ${True}
    Verify Module Permission  ${test_token}  scale
    Verify Module Permission  ${test_token}  stuff
    Verify Module Permission  ${test_token}  config  ${True}
    Verify Module Permission  ${test_token}  bid  ${True}
    Del Module from Company  ${ran_com}[id]  plan
    Verify Module Permission  ${test_token}  plan  ${True}  ${True}
    ${test_user}  Get Self User  ${test_token}
    FOR  ${itr}  IN  @{test_user}[related_roles]
        Unbind Role from Module  ${token}  ${itr}[name]  scale
    END
    Verify Module Permission  ${test_token}  scale  ${True}
    Verify Module Permission  ${token}  global  ${True}
    Verify Module Permission  ${test_token}  global  ${True}




