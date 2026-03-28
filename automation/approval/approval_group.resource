*** Settings ***
Resource  approval_opt.resource
Resource  ../group/group.resource

*** Keywords ***
Prepare Group Parent With Member For Approval
    Prepare Approval Environment
    Prepare Group Parent With Member On Current Approval Environment

Prepare Group Parent With Member On Current Approval Environment
    ${self}  Get Self Info  ${sc_admin_token}
    Convert To Group By Super Admin  ${sale_company}[id]  ${self}[id]
    Add Module To Company  ${sale_company}[id]  group
    Add Module To User  ${sc_admin_token}  1234  group
    ${member}  Create One Company  rf_approval_group_member
    Company Set Script  ${member}[id]  normal
    Add Module To Company  ${member}[id]  stuff
    Add Module To Company  ${member}[id]  cash
    Add Module To Company  ${member}[id]  sale_management
    Add Module To Company  ${member}[id]  approval
    ${add_m}  Create Dictionary  member_company_id=${member}[id]
    Req to Server  /group/group_member_add  ${sc_admin_token}  ${add_m}
    Group Grant Upsert Self On Member  ${sc_admin_token}  ${member}[id]  ${self}[id]  ${True}  ${True}
    Set Suite Variable  ${group_member_company}  ${member}

Cleanup Group Environment Only
    Group Tables Reset

Cleanup Group Approval Environment
    Cleanup Group Environment Only
    Cleanup Approval Environment

Set Both Approval Projects Default Approver
    [Arguments]  ${auditer_name}=sc_admin  ${token}=${sc_admin_token}
    ${projects}  Create List
    ${p1}  Create Dictionary  key=closed_order_price  enabled=${True}  approver_mode=default  auditer=${auditer_name}
    ${p2}  Create Dictionary  key=manual_verify_pay  enabled=${True}  approver_mode=default  auditer=${auditer_name}
    Append To List  ${projects}  ${p1}
    Append To List  ${projects}  ${p2}
    Set Approval Projects  ${projects}  ${token}
