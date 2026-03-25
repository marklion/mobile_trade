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

Home Stat Scope List
    [Arguments]  ${token}
    ${empty}  Create Dictionary
    ${ret}  Req to Server  /global/home_stat_scope_list  ${token}  ${empty}
    RETURN  ${ret}

# 返回 dict：parent、member、token、self（self 为 get_self_info 结果）
Build Converted Group With One Member
    [Arguments]  ${parent_company_name}  ${member_company_name}  ${admin_phone}  ${admin_open_id}
    ${parent}  Create One Company  ${parent_company_name}
    ${member}  Create One Company  ${member_company_name}
    ${token}  Login As Admin Of Company  ${parent}[id]  ${admin_phone}  ${admin_open_id}
    ${self}  Get Self Info  ${token}
    Convert To Group By Super Admin  ${parent}[id]  ${self}[id]
    ${add_m}  Create Dictionary  member_company_id=${member}[id]
    Req to Server  /group/group_member_add  ${token}  ${add_m}
    ${ctx}  Create Dictionary  parent=${parent}  member=${member}  token=${token}  self=${self}
    RETURN  ${ctx}

Group Grant Upsert Self On Member
    [Arguments]  ${token}  ${member_company_id}  ${self_user_id}  ${can_view}  ${can_operate}
    ${req}  Create Dictionary
    ...  member_company_id=${member_company_id}
    ...  user_id=${self_user_id}
    ...  can_view=${can_view}
    ...  can_operate=${can_operate}
    Req to Server  /group/group_grant_upsert  ${token}  ${req}
