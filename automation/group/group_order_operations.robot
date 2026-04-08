*** Settings ***
Resource          ../api_base.resource
Resource          ../database.resource
Resource          ../rbac/rbac_curd.resource
Resource          group.resource
Resource          group_order.resource
Resource          ../stuff/stuff_opt.resource

Suite Setup       Group Suite Reset
Suite Teardown    Group Suite Reset


*** Test Cases ***
Home Stat Scope List Returns Operate Member Company Ids
    [Teardown]    Group Suite Reset
    ${g}  Build Converted Group With One Member  rf_gord_hs_parent  rf_gord_hs_member  99887766220  rf_gord_hs
    Add Module To Company  ${g}[parent][id]  sale_management
    Add Module To User  ${g}[token]  99887766220  sale_management
    Group Grant Upsert Self On Member  ${g}[token]  ${g}[member][id]  ${g}[self][id]  ${True}  ${True}
    ${scopes}  Home Stat Scope List  ${g}[token]
    Dictionary Should Contain Key  ${scopes}  operate_member_company_ids
    ${ids}  Get From Dictionary  ${scopes}  operate_member_company_ids
    List Should Contain Value  ${ids}  ${g}[member][id]

Home Stat Scope List Includes Operate-Only Member Company
    [Teardown]    Group Suite Reset
    ${g}  Build Converted Group With One Member  rf_gord_hso_parent  rf_gord_hso_member  99887766221  rf_gord_hso
    Add Module To Company  ${g}[parent][id]  sale_management
    Add Module To User  ${g}[token]  99887766221  sale_management
    Group Grant Upsert Self On Member  ${g}[token]  ${g}[member][id]  ${g}[self][id]  ${False}  ${True}
    ${scopes}  Home Stat Scope List  ${g}[token]
    ${rows}  Get From Dictionary  ${scopes}  scopes
    ${hit}  Set Variable  ${False}
    FOR  ${s}  IN  @{rows}
        ${sid}  Get From Dictionary  ${s}  id
        ${same}  Evaluate  int(${sid}) == int(${g}[member][id])
        IF  ${same}
            ${hit}  Set Variable  ${True}
            Exit For Loop
        END
    END
    Should Be True  ${hit}

Parent With Operate Grant Confirms Member Sale Order
    [Teardown]    Group Suite Reset
    ${ctx}  Prepare Group Member Seller One Unconfirmed Plan With Operate Grant
    ${p}  Get Sale Plan By Id With Token And Stat Context  ${ctx}[parent_token]  ${ctx}[plan][id]  ${ctx}[member][id]
    Should Be Equal As Integers  ${p}[status]  ${0}
    ${req}  Create Dictionary  plan_id=${ctx}[plan][id]
    Req to Server  /sale_management/order_sale_confirm  ${ctx}[parent_token]  ${req}
    ${p2}  Get Sale Plan By Id With Token And Stat Context  ${ctx}[parent_token]  ${ctx}[plan][id]  ${ctx}[member][id]
    ${st}  Convert To Integer  ${p2}[status]
    Should Be Equal As Integers  ${st}  ${2}

Parent With Operate-Only Grant Confirms Member Sale Order
    [Teardown]    Group Suite Reset
    ${ctx}  Prepare Group Member Seller One Unconfirmed Plan
    Group Grant Upsert Self On Member  ${ctx}[parent_token]  ${ctx}[member][id]  ${ctx}[parent_self_id]  ${False}  ${True}
    ${p}  Get Sale Plan By Id With Token And Stat Context  ${ctx}[parent_token]  ${ctx}[plan][id]  ${ctx}[member][id]
    Should Be Equal As Integers  ${p}[status]  ${0}
    ${req}  Create Dictionary  plan_id=${ctx}[plan][id]
    Req to Server  /sale_management/order_sale_confirm  ${ctx}[parent_token]  ${req}
    ${p2}  Get Sale Plan By Id With Token And Stat Context  ${ctx}[parent_token]  ${ctx}[plan][id]  ${ctx}[member][id]
    ${st}  Convert To Integer  ${p2}[status]
    Should Be Equal As Integers  ${st}  ${2}

Parent Without Operate Grant Cannot Confirm Member Sale Order
    [Teardown]    Group Suite Reset
    ${ctx}  Prepare Group Member Seller One Unconfirmed Plan
    ${req}  Create Dictionary  plan_id=${ctx}[plan][id]
    ${err}  Req to Server  /sale_management/order_sale_confirm  ${ctx}[parent_token]  ${req}  ${True}
    Should Contain  ${err}  无权限

Order Search With Stat Context Returns Member Plans For Parent
    [Teardown]    Group Suite Reset
    ${ctx}  Prepare Group Member Seller One Unconfirmed Plan With Operate Grant
    ${found}  Get Sale Plan By Id With Token And Stat Context  ${ctx}[parent_token]  ${ctx}[plan][id]  ${ctx}[member][id]
    Should Be Equal As Integers  ${found}[id]  ${ctx}[plan][id]

Get Approval Projects With Plan Id For Member Sale Plan
    [Teardown]    Group Suite Reset
    ${ctx}  Prepare Group Member Seller One Unconfirmed Plan With Operate Grant
    Add Module To Company  ${ctx}[member][id]  approval
    Add Module To User  ${ctx}[member_token]  99887766111  approval
    ${req}  Create Dictionary  plan_id=${ctx}[plan][id]
    ${ret}  Req to Server  /approval/get_approval_projects  ${ctx}[parent_token]  ${req}
    Dictionary Should Contain Key  ${ret}  projects

Get Auditer Pick List With Plan Id For Member Sale Plan
    [Teardown]    Group Suite Reset
    ${ctx}  Prepare Group Member Seller One Unconfirmed Plan With Operate Grant
    ${req}  Create Dictionary  pageNo=${0}  plan_id=${ctx}[plan][id]
    ${ret}  Req to Server  /approval/get_auditer_pick_list  ${ctx}[parent_token]  ${req}
    Dictionary Should Contain Key  ${ret}  all_user

Get Verify Pay Config With Plan Id Uses Seller Company
    [Teardown]    Group Suite Reset
    ${ctx}  Prepare Group Member Seller One Unconfirmed Plan With Operate Grant
    Add Module To Company  ${ctx}[parent][id]  stuff
    Add Module To User  ${ctx}[parent_token]  99887766110  stuff
    ${req_off}  Create Dictionary  verify_pay_by_cash=${False}
    Req to Server  /stuff/set_verify_pay_config  ${ctx}[member_token]  ${req_off}
    ${gp_body}  Create Dictionary  plan_id=${ctx}[plan][id]
    ${q1}  Req to Server  /stuff/get_verify_pay_config  ${ctx}[parent_token]  ${gp_body}
    Should Not Be True  ${q1}[verify_pay_by_cash]
    ${req_on}  Create Dictionary  verify_pay_by_cash=${True}
    Req to Server  /stuff/set_verify_pay_config  ${ctx}[member_token]  ${req_on}
    ${q2}  Req to Server  /stuff/get_verify_pay_config  ${ctx}[parent_token]  ${gp_body}
    Should Be True  ${q2}[verify_pay_by_cash]

Parent With Operate Can Change Stuff Price On Member Material
    [Teardown]    Group Suite Reset
    ${ctx}  Prepare Group Member Seller One Unconfirmed Plan With Operate Grant
    Add Module To Company  ${ctx}[parent][id]  stuff
    Add Module To User  ${ctx}[parent_token]  99887766110  stuff
    ${stuff_id}  Set Variable  ${ctx}[stuff][id]
    ${chg}  Create Dictionary  stuff_id=${stuff_id}  price=${8888}  to_plan=${True}  comment=rf_gord_price
    Req to Server  /stuff/change_price  ${ctx}[parent_token]  ${chg}
    @{stuffs}  Req Get to Server  /stuff/get_all  ${ctx}[member_token]  stuff
    ${hit}  Set Variable  ${False}
    FOR  ${s}  IN  @{stuffs}
        ${sid}  Get From Dictionary  ${s}  id
        ${is_same}  Evaluate  int(${sid}) == int(${stuff_id})
        IF  ${is_same}
            Should Be Equal As Numbers  ${s}[price]  ${8888}
            ${hit}  Set Variable  ${True}
            Exit For Loop
        END
    END
    Should Be True  ${hit}

Parent With Operate On Member Changes Unclosed Plan Price Directly
    [Teardown]    Group Suite Reset
    ${ctx}  Prepare Group Member Seller One Unconfirmed Plan With Operate Grant
    Add Module To Company  ${ctx}[parent][id]  stuff
    Add Module To User  ${ctx}[parent_token]  99887766110  stuff
    Add Module To Company  ${ctx}[member][id]  approval
    Add Module To User  ${ctx}[member_token]  99887766111  approval
    Add Module To Company  ${ctx}[parent][id]  approval
    Add Module To User  ${ctx}[parent_token]  99887766110  approval
    ${projects}  Create List
    ${p1}  Create Dictionary  key=closed_order_price  enabled=${True}  approver_mode=default  auditer=rf_gord_mem
    ${p2}  Create Dictionary  key=manual_verify_pay  enabled=${False}  approver_mode=default  auditer=${EMPTY}
    Append To List  ${projects}  ${p1}
    Append To List  ${projects}  ${p2}
    ${set_req}  Create Dictionary  projects=${projects}
    Req to Server  /approval/set_approval_projects  ${ctx}[member_token]  ${set_req}
    ${before}  Get Sale Plan By Id With Token And Stat Context  ${ctx}[parent_token]  ${ctx}[plan][id]  ${ctx}[member][id]
    ${old_price}  Set Variable  ${before}[unit_price]
    ${new_price}  Evaluate  float(${old_price}) + 7.01
    ${plan_id_str}  Convert To String  ${ctx}[plan][id]
    ${chg_req}  Create Dictionary
    ...  unit_price=${new_price}
    ...  plan_id=${plan_id_str}
    ...  comment=rf_gord_unclosed_direct
    Req to Server  /stuff/change_price_by_plan  ${ctx}[parent_token]  ${chg_req}
    ${after}  Get Sale Plan By Id With Token And Stat Context  ${ctx}[parent_token]  ${ctx}[plan][id]  ${ctx}[member][id]
    Should Be Equal As Numbers  ${after}[unit_price]  ${new_price}
    Should Be Equal As Integers  ${after}[status]  ${0}
    ${audit_req}  Create Dictionary  status=${0}
    ${audit_ret}  Req to Server  /approval/get_audit4req  ${ctx}[member_token]  ${audit_req}
    Should Be Equal As Integers  ${audit_ret}[total]  ${0}

Parent With Operate Triggers Manual Verify Pay Approval
    [Teardown]    Group Suite Reset
    ${ctx}  Prepare Group Member Seller One Unconfirmed Plan With Operate Grant
    Add Module To Company  ${ctx}[member][id]  approval
    Add Module To User  ${ctx}[member_token]  99887766111  approval
    Add Module To Company  ${ctx}[parent][id]  approval
    Add Module To User  ${ctx}[parent_token]  99887766110  approval
    ${projects}  Create List
    ${p1}  Create Dictionary  key=closed_order_price  enabled=${False}  approver_mode=default  auditer=${EMPTY}
    ${p2}  Create Dictionary  key=manual_verify_pay  enabled=${True}  approver_mode=default  auditer=rf_gord_mem
    Append To List  ${projects}  ${p1}
    Append To List  ${projects}  ${p2}
    ${set_req}  Create Dictionary  projects=${projects}
    Req to Server  /approval/set_approval_projects  ${ctx}[member_token]  ${set_req}
    ${confirm_req}  Create Dictionary  plan_id=${ctx}[plan][id]
    Req to Server  /sale_management/order_sale_confirm  ${ctx}[parent_token]  ${confirm_req}
    ${before}  Get Sale Plan By Id With Token And Stat Context  ${ctx}[parent_token]  ${ctx}[plan][id]  ${ctx}[member][id]
    Should Be Equal As Integers  ${before}[status]  ${2}
    ${pay_req}  Create Dictionary  plan_id=${ctx}[plan][id]
    ${pay_ret}  Req to Server  /sale_management/order_sale_pay  ${ctx}[parent_token]  ${pay_req}
    Dictionary Should Contain Key  ${pay_ret}  result
    Should Be True  ${pay_ret}[result]
    ${after}  Get Sale Plan By Id With Token And Stat Context  ${ctx}[parent_token]  ${ctx}[plan][id]  ${ctx}[member][id]
    Should Be Equal As Integers  ${after}[status]  ${2}

Parent With Operate Triggers Closed Order Price Approval
    [Teardown]    Group Suite Reset
    ${ctx}  Prepare Group Member Seller One Unconfirmed Plan With Operate Grant
    Add Module To Company  ${ctx}[member][id]  approval
    Add Module To User  ${ctx}[member_token]  99887766111  approval
    Add Module To Company  ${ctx}[parent][id]  approval
    Add Module To User  ${ctx}[parent_token]  99887766110  approval
    Add Module To Company  ${ctx}[parent][id]  stuff
    Add Module To User  ${ctx}[parent_token]  99887766110  stuff
    ${sw_req}  Create Dictionary  change_finished_order_price_switch=${True}
    Req to Server  /stuff/set_change_finished_order_price_switch  ${ctx}[member_token]  ${sw_req}
    ${projects}  Create List
    ${p1}  Create Dictionary  key=closed_order_price  enabled=${True}  approver_mode=default  auditer=rf_gord_mem
    ${p2}  Create Dictionary  key=manual_verify_pay  enabled=${False}  approver_mode=default  auditer=${EMPTY}
    Append To List  ${projects}  ${p1}
    Append To List  ${projects}  ${p2}
    ${set_req}  Create Dictionary  projects=${projects}
    Req to Server  /approval/set_approval_projects  ${ctx}[member_token]  ${set_req}
    ${close_req}  Create Dictionary  plan_id=${ctx}[plan][id]
    Req to Server  /sale_management/close  ${ctx}[parent_token]  ${close_req}
    ${before}  Get Sale Plan By Id With Token And Stat Context  ${ctx}[parent_token]  ${ctx}[plan][id]  ${ctx}[member][id]
    Should Be Equal As Integers  ${before}[status]  ${3}
    ${old_price}  Set Variable  ${before}[unit_price]
    ${new_price}  Evaluate  float(${old_price}) + 9.99
    ${plan_id_str}  Convert To String  ${ctx}[plan][id]
    ${chg_req}  Create Dictionary
    ...  unit_price=${new_price}
    ...  plan_id=${plan_id_str}
    ...  comment=rf_gord_closed_approval
    Req to Server  /stuff/change_price_by_plan  ${ctx}[parent_token]  ${chg_req}  ${False}  ${False}  ${True}
    ${after}  Get Sale Plan By Id With Token And Stat Context  ${ctx}[parent_token]  ${ctx}[plan][id]  ${ctx}[member][id]
    Should Be Equal As Numbers  ${after}[unit_price]  ${old_price}
    ${audit_req}  Create Dictionary  status=${0}
    ${audit_ret}  Req to Server  /approval/get_audit4req  ${ctx}[member_token]  ${audit_req}
    ${closed_hit}  Set Variable  ${False}
    FOR  ${r}  IN  @{audit_ret}[records]
        ${pk}  Get From Dictionary  ${r}  project_key
        IF  '${pk}' == 'closed_order_price'
            ${closed_hit}  Set Variable  ${True}
            Exit For Loop
        END
    END
    Should Be True  ${closed_hit}

Parent With Operate Uses Member Stuff Scope And Changes Price
    [Teardown]    Group Suite Reset
    ${ctx}  Prepare Group Member Seller One Unconfirmed Plan With Operate Grant
    Add Module To Company  ${ctx}[parent][id]  stuff
    Add Module To User  ${ctx}[parent_token]  99887766110  stuff
    ${list_req}  Create Dictionary  stat_context_company_id=${ctx}[member][id]
    ${list_ret}  Req to Server  /stuff/get_all  ${ctx}[parent_token]  ${list_req}
    Should Be Equal As Integers  ${list_ret}[total]  ${1}
    Should Be Equal As Integers  ${list_ret}[stuff][0][id]  ${ctx}[stuff][id]
    ${chg}  Create Dictionary  stuff_id=${ctx}[stuff][id]  price=${7777}  to_plan=${True}  comment=rf_gord_scope_price
    Req to Server  /stuff/change_price  ${ctx}[parent_token]  ${chg}
    ${verify_req}  Create Dictionary  stat_context_company_id=${ctx}[member][id]
    ${verify_ret}  Req to Server  /stuff/get_all  ${ctx}[parent_token]  ${verify_req}
    Should Be Equal As Numbers  ${verify_ret}[stuff][0][price]  ${7777}

Sale Batch Confirm Accepts Stat Context Company Id
    [Teardown]    Group Suite Reset
    ${ctx}  Prepare Group Member Seller One Unconfirmed Plan With Operate Grant
    ${today}  Get Current Date  result_format=%Y-%m-%d
    ${batch_req}  Create Dictionary
    ...  start_time=${today}
    ...  end_time=${today}
    ...  status=${0}
    ...  stat_context_company_id=${ctx}[member][id]
    Req to Server  /sale_management/order_batch_confirm  ${ctx}[parent_token]  ${batch_req}
    ${p}  Get Sale Plan By Id With Token And Stat Context  ${ctx}[parent_token]  ${ctx}[plan][id]  ${ctx}[member][id]
    @{ok_status}  Create List  ${1}  ${2}
    List Should Contain Value  ${ok_status}  ${p}[status]
