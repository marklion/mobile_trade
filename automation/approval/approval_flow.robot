*** Settings ***
Resource  approval_opt.resource
Resource  approval_group.resource
Suite Setup    Run Keywords    Prepare Approval Environment    AND    Seed Approval E2E Plans
Suite Teardown    Cleanup Approval Environment

*** Test Cases ***
Approval Project Switch And Readback
    ${projects}=  Create List
    ${p1}=  Create Dictionary  key=closed_order_price  enabled=${True}  approver_mode=default  auditer=sc_admin
    ${p2}=  Create Dictionary  key=manual_verify_pay  enabled=${False}  approver_mode=default  auditer=
    Append To List  ${projects}  ${p1}
    Append To List  ${projects}  ${p2}
    Set Approval Projects  ${projects}
    ${resp}=  Get Approval Projects
    Should Not Be Empty  ${resp}[projects]

Closed Order Price Adjustment Approval Approve Path
    [Teardown]  Approval Reset
    ${snap}  Get Plan By Id  ${approval_closed_plan_id}
    ${orig_unit}  Set Variable  ${snap}[unit_price]
    ${projects}=  Create List
    ${p1}=  Create Dictionary  key=closed_order_price  enabled=${True}  approver_mode=default  auditer=sc_admin
    ${p2}=  Create Dictionary  key=manual_verify_pay  enabled=${False}  approver_mode=default  auditer=
    Append To List  ${projects}  ${p1}
    Append To List  ${projects}  ${p2}
    Set Approval Projects  ${projects}
    Trigger Closed Order Price Approval
    Assert Plan Unit Price  ${approval_closed_plan_id}  ${orig_unit}
    ${records}=  Get Approval Records
    Length Should Be  ${records}  1
    Should Be Equal  ${records}[0][status]  pending
    ${ar_id}  Set Variable  ${records}[0][id]
    Assert Approval Progress For Record In List  ${records}  ${ar_id}  待审批
    Should Be Equal  ${records}[0][submiter]  sc_admin
    Approve Record  ${ar_id}
    Assert Plan Unit Price  ${approval_closed_plan_id}  ${66.88}
    ${done_records}=  Get Approval Records  ${sc_admin_token}  ${1}
    Length Should Be  ${done_records}  1
    Assert Approval Progress For Record In List  ${done_records}  ${ar_id}  已通过

Manual Verify Pay Approval Reject Path
    [Teardown]  Approval Reset
    ${projects}=  Create List
    ${p1}=  Create Dictionary  key=closed_order_price  enabled=${False}  approver_mode=default  auditer=
    ${p2}=  Create Dictionary  key=manual_verify_pay  enabled=${True}  approver_mode=default  auditer=sc_admin
    Append To List  ${projects}  ${p1}
    Append To List  ${projects}  ${p2}
    Set Approval Projects  ${projects}
    ${cfg}=  Get Approval Projects
    Should Be Equal  ${cfg}[projects][1][enabled]  ${True}
    ${pay0}  Get Plan By Id  ${approval_pay_plan_id}
    ${arr_before}  Set Variable  ${pay0}[arrears]
    Should Be Equal As Integers  ${pay0}[status]  ${1}
    Trigger Manual Verify Pay Approval
    Assert Sale Plan Status And Arrears  ${approval_pay_plan_id}  ${1}  ${arr_before}
    ${records}=  Get Approval Records
    Length Should Be  ${records}  1
    Should Be Equal  ${records}[0][project_key]  manual_verify_pay
    ${pay_ar_id}  Set Variable  ${records}[0][id]
    Assert Approval Progress For Record In List  ${records}  ${pay_ar_id}  待审批
    Should Be Equal  ${records}[0][submiter]  sc_admin
    Reject Record  ${pay_ar_id}
    Assert Sale Plan Status And Arrears  ${approval_pay_plan_id}  ${1}  ${arr_before}
    ${rejected}=  Get Approval Records  ${sc_admin_token}  ${2}
    Length Should Be  ${rejected}  1
    Assert Approval Progress For Record In List  ${rejected}  ${pay_ar_id}  已驳回

Submit Specify Approver Manual Verify Pay
    [Teardown]  Approval Reset
    ${projects}=  Create List
    ${p1}=  Create Dictionary  key=closed_order_price  enabled=${False}  approver_mode=default  auditer=
    ${p2}=  Create Dictionary  key=manual_verify_pay  enabled=${True}  approver_mode=submit_specify  auditer=
    Append To List  ${projects}  ${p1}
    Append To List  ${projects}  ${p2}
    Set Approval Projects  ${projects}
    ${pb}  Get Plan By Id  ${approval_pay_plan_b_id}
    ${arr_b}  Set Variable  ${pb}[arrears]
    Should Be Equal As Integers  ${pb}[status]  ${1}
    Trigger Manual Verify Pay Approval  ${sc_admin_token}  sc_admin  ${approval_pay_plan_b_id}
    Assert Sale Plan Status And Arrears  ${approval_pay_plan_b_id}  ${1}  ${arr_b}
    ${records}=  Get Approval Records
    Length Should Be  ${records}  ${1}
    Should Be Equal  ${records}[0][auditer]  sc_admin
    ${spec_b_id}  Set Variable  ${records}[0][id]
    Approve Record  ${spec_b_id}
    Assert Sale Plan Status And Arrears  ${approval_pay_plan_b_id}  ${2}  ${0}

Submit Specify Requires Approval Auditer
    [Teardown]  Approval Reset
    ${projects}=  Create List
    ${p1}=  Create Dictionary  key=closed_order_price  enabled=${False}  approver_mode=default  auditer=
    ${p2}=  Create Dictionary  key=manual_verify_pay  enabled=${True}  approver_mode=submit_specify  auditer=
    Append To List  ${projects}  ${p1}
    Append To List  ${projects}  ${p2}
    Set Approval Projects  ${projects}
    ${req}  Create Dictionary  plan_id=${approval_pay_plan_c_id}
    ${err}=  Req to Server  /cash/order_sale_pay  ${sc_admin_token}  ${req}  ${True}
    Should Contain  ${err}  指定审批人

Specified Approver And Default Approver
    [Teardown]  Approval Reset
    ${new_user_token}  New User Login  ap_user_phone  ${sale_company}[name]  ap_user_open_id  ap_user_name
    Add Module To User  ${sc_admin_token}  ap_user_phone  approval
    ${projects}=  Create List
    ${p1}=  Create Dictionary  key=closed_order_price  enabled=${True}  approver_mode=default  auditer=ap_user_name
    ${p2}=  Create Dictionary  key=manual_verify_pay  enabled=${True}  approver_mode=default  auditer=ap_user_name
    Append To List  ${projects}  ${p1}
    Append To List  ${projects}  ${p2}
    Set Approval Projects  ${projects}
    ${pc}  Get Plan By Id  ${approval_closed_plan_id}
    ${u0}  Set Variable  ${pc}[unit_price]
    ${pd}  Get Plan By Id  ${approval_pay_plan_d_id}
    ${arr_d0}  Set Variable  ${pd}[arrears]
    Trigger Closed Order Price Approval  unit_price=77.77
    Trigger Manual Verify Pay Approval  plan_id=${approval_pay_plan_d_id}
    Assert Plan Unit Price  ${approval_closed_plan_id}  ${u0}
    Assert Sale Plan Status And Arrears  ${approval_pay_plan_d_id}  ${1}  ${arr_d0}
    ${records}=  Get Approval Records  ${new_user_token}
    Length Should Be  ${records}  2
    Should Be Equal  ${records}[0][auditer]  ap_user_name
    Should Be Equal  ${records}[1][auditer]  ap_user_name
    Approve Record  ${records}[1][id]  ${new_user_token}
    Approve Record  ${records}[0][id]  ${new_user_token}
    Assert Plan Unit Price  ${approval_closed_plan_id}  ${77.77}
    Assert Sale Plan Status And Arrears  ${approval_pay_plan_d_id}  ${2}  ${0}

Group Parent Company Both Approval Projects Default Approver Approve
    [Setup]    Prepare Group Parent With Member On Current Approval Environment
    [Teardown]    Run Keywords    Approval Reset    AND    Cleanup Group Environment Only
    Set Both Approval Projects Default Approver  sc_admin
    ${g_closed}  Get Plan By Id  ${approval_closed_plan_id}
    ${u_grp0}  Set Variable  ${g_closed}[unit_price]
    ${g_pay}  Get Plan By Id  ${approval_pay_plan_e_id}
    ${arr_e0}  Set Variable  ${g_pay}[arrears]
    Should Be Equal As Integers  ${g_pay}[status]  ${1}
    Trigger Closed Order Price Approval  unit_price=88.88
    Trigger Manual Verify Pay Approval  plan_id=${approval_pay_plan_e_id}
    Assert Plan Unit Price  ${approval_closed_plan_id}  ${u_grp0}
    Assert Sale Plan Status And Arrears  ${approval_pay_plan_e_id}  ${1}  ${arr_e0}
    ${records}=  Get Approval Records
    Length Should Be  ${records}  2
    Should Be Equal  ${records}[0][project_key]  manual_verify_pay
    Should Be Equal  ${records}[1][project_key]  closed_order_price
    Should Be Equal  ${records}[0][status]  pending
    Should Be Equal  ${records}[1][status]  pending
    ${grp_pay_id}  Set Variable  ${records}[0][id]
    ${grp_price_id}  Set Variable  ${records}[1][id]
    Assert Approval Progress For Record In List  ${records}  ${grp_pay_id}  待审批
    Assert Approval Progress For Record In List  ${records}  ${grp_price_id}  待审批
    Approve Record  ${records}[0][id]
    Approve Record  ${records}[1][id]
    ${done}=  Get Approval Records  ${sc_admin_token}  ${1}
    Length Should Be  ${done}  2
    Assert Approval Progress For Record In List  ${done}  ${grp_pay_id}  已通过
    Assert Approval Progress For Record In List  ${done}  ${grp_price_id}  已通过
    Assert Plan Unit Price  ${approval_closed_plan_id}  ${88.88}
    Assert Sale Plan Status And Arrears  ${approval_pay_plan_e_id}  ${2}  ${0}

Group Parent Company Manual Pay Submit Specify Approver
    [Setup]    Prepare Group Parent With Member On Current Approval Environment
    [Teardown]    Run Keywords    Approval Reset    AND    Cleanup Group Environment Only
    ${projects}  Create List
    ${p1}  Create Dictionary  key=closed_order_price  enabled=${False}  approver_mode=default  auditer=
    ${p2}  Create Dictionary  key=manual_verify_pay  enabled=${True}  approver_mode=submit_specify  auditer=
    Append To List  ${projects}  ${p1}
    Append To List  ${projects}  ${p2}
    Set Approval Projects  ${projects}
    ${gf}  Get Plan By Id  ${approval_pay_plan_f_id}
    ${arr_f0}  Set Variable  ${gf}[arrears]
    Should Be Equal As Integers  ${gf}[status]  ${1}
    Trigger Manual Verify Pay Approval  ${sc_admin_token}  sc_admin  ${approval_pay_plan_f_id}
    Assert Sale Plan Status And Arrears  ${approval_pay_plan_f_id}  ${1}  ${arr_f0}
    ${records}=  Get Approval Records
    Length Should Be  ${records}  1
    Should Be Equal  ${records}[0][auditer]  sc_admin
    ${grp_spec_id}  Set Variable  ${records}[0][id]
    Assert Approval Progress For Record In List  ${records}  ${grp_spec_id}  待审批
    Reject Record  ${records}[0][id]
    Assert Sale Plan Status And Arrears  ${approval_pay_plan_f_id}  ${1}  ${arr_f0}
    ${rej}=  Get Approval Records  ${sc_admin_token}  ${2}
    Assert Approval Progress For Record In List  ${rej}  ${grp_spec_id}  已驳回

Group Member Company Approval Config Isolated From Parent
    [Setup]    Prepare Group Parent With Member On Current Approval Environment
    [Teardown]    Run Keywords    Approval Reset    AND    Cleanup Group Environment Only
    ${mem_token}  Login As Admin Of Company  ${group_member_company}[id]  88776602  rf_mem_approval_adm
    Add Module To User  ${mem_token}  88776602  approval
    ${mproj}  Create List
    ${m1}  Create Dictionary  key=closed_order_price  enabled=${False}  approver_mode=default  auditer=
    ${m2}  Create Dictionary  key=manual_verify_pay  enabled=${True}  approver_mode=default  auditer=rf_mem_approval_adm
    Append To List  ${mproj}  ${m1}
    Append To List  ${mproj}  ${m2}
    ${mreq}  Create Dictionary  projects=${mproj}
    ${merr}  Req to Server  /approval/set_approval_projects  ${mem_token}  ${mreq}  ${True}
    Should Contain  ${merr}  当前公司不是集团
    ${pproj}  Create List
    ${n1}  Create Dictionary  key=closed_order_price  enabled=${False}  approver_mode=default  auditer=
    ${n2}  Create Dictionary  key=manual_verify_pay  enabled=${False}  approver_mode=default  auditer=
    Append To List  ${pproj}  ${n1}
    Append To List  ${pproj}  ${n2}
    Set Approval Projects  ${pproj}  ${sc_admin_token}
    ${mr}  Get Approval Projects  ${mem_token}
    ${pr}  Get Approval Projects  ${sc_admin_token}
    Should Be Equal  ${mr}[projects][1][enabled]  ${False}
    Should Be Equal  ${pr}[projects][1][enabled]  ${False}
