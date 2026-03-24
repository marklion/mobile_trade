*** Settings ***
Resource  ../api_base.resource
Resource  ../database.resource
Resource  ../rbac/rbac_curd.resource
Resource  group.resource

Suite Setup       Group Suite Reset
Suite Teardown    Group Suite Reset


*** Test Cases ***
Convert To Group Self Info Shows Group Admin
    [Teardown]  Group Suite Reset
    ${parent}  Create One Company  rf_grp_parent_01
    ${member}  Create One Company  rf_grp_member_01
    ${token}  Login As Admin Of Company  ${parent}[id]  99887766101  rf_grp_admin
    ${self}  Get Self Info  ${token}
    Convert To Group By Super Admin  ${parent}[id]  ${self}[id]
    ${self2}  Get Self Info  ${token}
    Should Be True  ${self2}[company_is_group]
    Should Be True  ${self2}[is_group_admin]

Group Member Add List And Remove
    [Teardown]  Group Suite Reset
    ${parent}  Create One Company  rf_grp_parent_02
    ${member}  Create One Company  rf_grp_member_02
    ${token}  Login As Admin Of Company  ${parent}[id]  99887766202  rf_grp_admin2
    ${self}  Get Self Info  ${token}
    Convert To Group By Super Admin  ${parent}[id]  ${self}[id]
    ${empty}  Create Dictionary
    ${before}  Req to Server  /group/group_member_list  ${token}  ${empty}
    Length Should Be  ${before}[members]  0
    ${add_req}  Create Dictionary  member_company_id=${member}[id]
    Req to Server  /group/group_member_add  ${token}  ${add_req}
    ${after}  Req to Server  /group/group_member_list  ${token}  ${empty}
    Length Should Be  ${after}[members]  1
    Should Be Equal As Integers  ${after}[members][0][member_company_id]  ${member}[id]
    ${dup_err}  Req to Server  /group/group_member_add  ${token}  ${add_req}  ${True}
    Should Contain  ${dup_err}  成员
    ${rm_req}  Create Dictionary  member_company_id=${member}[id]
    Req to Server  /group/group_member_remove  ${token}  ${rm_req}
    ${final}  Req to Server  /group/group_member_list  ${token}  ${empty}
    Length Should Be  ${final}[members]  0

Group Grant Upsert List And Delete
    [Teardown]  Group Suite Reset
    ${parent}  Create One Company  rf_grp_parent_03
    ${member}  Create One Company  rf_grp_member_03
    ${token}  Login As Admin Of Company  ${parent}[id]  99887766303  rf_grp_admin3
    ${self}  Get Self Info  ${token}
    Convert To Group By Super Admin  ${parent}[id]  ${self}[id]
    ${add_m}  Create Dictionary  member_company_id=${member}[id]
    Req to Server  /group/group_member_add  ${token}  ${add_m}
    ${empty}  Create Dictionary
    ${users}  Req to Server  /group/group_home_user_list  ${token}  ${empty}
    Should Not Be Empty  ${users}[users]
    ${grant_req}  Create Dictionary
    ...  member_company_id=${member}[id]
    ...  user_id=${self}[id]
    ...  can_view=${True}
    ...  can_operate=${False}
    Req to Server  /group/group_grant_upsert  ${token}  ${grant_req}
    ${grants}  Req to Server  /group/group_grant_list  ${token}  ${empty}
    Length Should Be  ${grants}[grants]  1
    Should Be True  ${grants}[grants][0][can_view]
    ${upd_req}  Create Dictionary
    ...  member_company_id=${member}[id]
    ...  user_id=${self}[id]
    ...  can_view=${False}
    ...  can_operate=${True}
    Req to Server  /group/group_grant_upsert  ${token}  ${upd_req}
    ${grants2}  Req to Server  /group/group_grant_list  ${token}  ${empty}
    Should Not Be True  ${grants2}[grants][0][can_view]
    Should Be True  ${grants2}[grants][0][can_operate]
    ${del_req}  Create Dictionary  member_company_id=${member}[id]  user_id=${self}[id]
    Req to Server  /group/group_grant_delete  ${token}  ${del_req}
    ${grants3}  Req to Server  /group/group_grant_list  ${token}  ${empty}
    Length Should Be  ${grants3}[grants]  0

Non Group Admin Cannot Call Group Api
    [Teardown]  Group Suite Reset
    ${parent}  Create One Company  rf_grp_parent_04
    ${member}  Create One Company  rf_grp_member_04
    ${admin_tok}  Login As Admin Of Company  ${parent}[id]  99887766401  rf_grp_ad4
    ${self}  Get Self Info  ${admin_tok}
    Convert To Group By Super Admin  ${parent}[id]  ${self}[id]
    New User Login  99887766402  ${parent}[name]  rf_open_sub_04  sub_user_rf
    ${sub_tok}  User Login With Phone  99887766402
    ${empty}  Create Dictionary
    ${err}  Req to Server  /group/group_member_list  ${sub_tok}  ${empty}  ${True}
    Should Contain  ${err}  集团管理员

Group Member Candidate List Returns Page
    [Teardown]  Group Suite Reset
    ${parent}  Create One Company  rf_grp_parent_05
    Create One Company  rf_grp_plain_05
    ${token}  Login As Admin Of Company  ${parent}[id]  99887766501  rf_grp_ad5
    ${self}  Get Self Info  ${token}
    Convert To Group By Super Admin  ${parent}[id]  ${self}[id]
    @{cands}  Req Get to Server  /group/group_member_candidate_list  ${token}  candidates  ${0}
    Should Not Be Empty  ${cands}
