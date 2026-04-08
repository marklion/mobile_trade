*** Settings ***
Resource  approval_group.resource
Suite Setup    Run Keywords    Prepare Approval Environment    AND    Prepare Group Parent With Member On Current Approval Environment
Suite Teardown    Cleanup Group Approval Environment

*** Keywords ***
Build Member Stuff Plan Context
    [Arguments]  ${idx}=0
    ${phone_num}  Evaluate  88776000 + ${idx}
    ${phone}  Convert To String  ${phone_num}
    ${member_token}  Login As Admin Of Company  ${group_member_company}[id]  ${phone}  rf_mem_admin_${idx}
    Add Module To User  ${member_token}  ${phone}  stuff
    Add Module To User  ${member_token}  ${phone}  cash
    Add Module To User  ${member_token}  ${phone}  sale_management
    Add Module To User  ${member_token}  ${phone}  approval
    ${member_stuff}  Add A Stuff To Sale  rf_member_stuff_${idx}  rf_member_stuff_comment_${idx}  ${22}  ${member_token}
    Add A Company As Customer  ${buy_company1}[id]  ${member_token}
    Add A Stuff To Contract  ${member_stuff}[name]  ${buy_company1}[name]  ${member_token}
    Authorize User to Contract  ${buy_company1}[name]  5678  ${member_token}
    ${mv}  Search Main Vehicle by Index  ${idx}
    ${bv}  Search behind Vehicle by Index  ${idx}
    ${dv}  Search Driver by Index  ${idx}
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]  ${bc1_user_token}  today  测试备注  测试地点  测试用途  ${member_stuff}[id]
    ${ctx}  Create Dictionary  member_token=${member_token}  member_stuff=${member_stuff}  plan=${plan}
    RETURN  ${ctx}

Set Closed Order Price Approval Only
    ${projects}=  Create List
    ${p1}=  Create Dictionary  key=closed_order_price  enabled=${True}  approver_mode=default  auditer=sc_admin
    ${p2}=  Create Dictionary  key=manual_verify_pay  enabled=${False}  approver_mode=default  auditer=
    Append To List  ${projects}  ${p1}
    Append To List  ${projects}  ${p2}
    Set Approval Projects  ${projects}

Set Manual Verify Pay Approval Only
    ${projects}=  Create List
    ${p1}=  Create Dictionary  key=closed_order_price  enabled=${False}  approver_mode=default  auditer=
    ${p2}=  Create Dictionary  key=manual_verify_pay  enabled=${True}  approver_mode=default  auditer=sc_admin
    Append To List  ${projects}  ${p1}
    Append To List  ${projects}  ${p2}
    Set Approval Projects  ${projects}

Disable Both Approvals
    ${projects}=  Create List
    ${p1}=  Create Dictionary  key=closed_order_price  enabled=${False}  approver_mode=default  auditer=
    ${p2}=  Create Dictionary  key=manual_verify_pay  enabled=${False}  approver_mode=default  auditer=
    Append To List  ${projects}  ${p1}
    Append To List  ${projects}  ${p2}
    Set Approval Projects  ${projects}

Set Member Finished Price Change Switch
    [Arguments]  ${member_token}  ${is_open}=${True}
    ${req}  Create Dictionary  change_finished_order_price_switch=${is_open}
    Req to Server  /stuff/set_change_finished_order_price_switch  ${member_token}  ${req}

Get Plan By Id For Token
    [Arguments]  ${plan_id}  ${token}
    ${plans}  Search Plans Based on User  ${token}
    ${target_plan_id}  Convert To String  ${plan_id}
    ${ret}  Create Dictionary
    FOR  ${itr}  IN  @{plans}
        ${pid}  Set Variable  ${itr}[id]
        ${pid_str}  Convert To String  ${pid}
        IF  $pid_str == $target_plan_id
            ${ret}  Set Variable  ${itr}
            Exit For Loop
        END
    END
    IF  $ret == {}
        ${order_search_status}  ${order_search_ret}  Run Keyword And Ignore Error  Search Orders Based on User  ${token}
        IF  '${order_search_status}' == 'PASS'
            FOR  ${itr}  IN  @{order_search_ret}
                ${pid}  Set Variable  ${itr}[id]
                ${pid_str}  Convert To String  ${pid}
                IF  $pid_str == $target_plan_id
                    ${ret}  Set Variable  ${itr}
                    Exit For Loop
                END
            END
        END
    END
    Should Not Be Empty  ${ret}
    RETURN  ${ret}

*** Test Cases ***
Group Parent Confirm Member Plan
    [Teardown]  Run Keywords  Plan Reset  AND  Approval Reset
    ${ctx}  Build Member Stuff Plan Context  ${101}
    Confirm A Plan  ${ctx}[plan]  ${sc_admin_token}
    ${p}  Get Plan By Id For Token  ${ctx}[plan][id]  ${ctx}[member_token]
    Should Be Equal As Integers  ${p}[status]  ${2}

Group Parent Trigger Manual Verify Pay Approval For Member Plan
    [Teardown]  Run Keywords  Plan Reset  AND  Approval Reset
    ${ctx}  Build Member Stuff Plan Context  ${102}
    Confirm A Plan  ${ctx}[plan]  ${sc_admin_token}
    Set Manual Verify Pay Approval Only
    ${req}  Create Dictionary  plan_id=${ctx}[plan][id]
    Req to Server  /cash/order_sale_pay  ${sc_admin_token}  ${req}  ${False}  ${False}  ${True}
    ${p_after}  Get Plan By Id For Token  ${ctx}[plan][id]  ${ctx}[member_token]
    Should Be Equal As Integers  ${p_after}[status]  ${2}
    ${records}  Get Approval Records
    Length Should Be  ${records}  1
    Should Be Equal  ${records}[0][project_key]  manual_verify_pay
    Should Be Equal  ${records}[0][status]  pending

Group Parent Trigger Closed Order Price Approval For Member Plan
    [Teardown]  Run Keywords  Plan Reset  AND  Approval Reset
    ${ctx}  Build Member Stuff Plan Context  ${103}
    Set Member Finished Price Change Switch  ${ctx}[member_token]  ${True}
    Confirm A Plan  ${ctx}[plan]  ${sc_admin_token}
    Manual Pay A Plan  ${ctx}[plan]  ${sc_admin_token}  ${True}  ${False}
    Deliver A Plan  ${ctx}[plan]  ${20}
    ${before}  Get Plan By Id For Token  ${ctx}[plan][id]  ${ctx}[member_token]
    Should Be Equal As Integers  ${before}[status]  ${3}
    Set Closed Order Price Approval Only
    ${pid}  Convert To String  ${ctx}[plan][id]
    ${req}  Create Dictionary  unit_price=${88.88}  plan_id=${pid}  comment=group_closed_price_audit
    Req to Server  /stuff/change_price_by_plan  ${sc_admin_token}  ${req}  ${False}  ${False}  ${True}
    ${after}  Get Plan By Id For Token  ${ctx}[plan][id]  ${ctx}[member_token]
    Should Be Equal As Numbers  ${after}[unit_price]  ${before}[unit_price]
    ${records}  Get Approval Records
    Length Should Be  ${records}  1
    Should Be Equal  ${records}[0][project_key]  closed_order_price
    Should Be Equal  ${records}[0][status]  pending

Group Parent Change Member Stuff Price
    [Teardown]  Run Keywords  Plan Reset  AND  Approval Reset
    ${ctx}  Build Member Stuff Plan Context  ${104}
    Change Stuff Price  ${ctx}[member_stuff][id]  ${2233}  ${False}  group_member_direct_change  ${sc_admin_token}
    ${member_stuff_after}  Get Stuff By Id  ${ctx}[member_stuff][id]  ${ctx}[member_token]
    Should Be Equal As Numbers  ${member_stuff_after}[price]  ${2233}

Group Parent Directly Change Open Plan Price
    [Teardown]  Run Keywords  Plan Reset  AND  Approval Reset
    ${ctx}  Build Member Stuff Plan Context  ${105}
    Confirm A Plan  ${ctx}[plan]  ${sc_admin_token}
    Disable Both Approvals
    ${pid}  Convert To String  ${ctx}[plan][id]
    ${req}  Create Dictionary  unit_price=${77.77}  plan_id=${pid}  comment=group_open_direct_change
    Req to Server  /stuff/change_price_by_plan  ${sc_admin_token}  ${req}
    ${p_after}  Get Plan By Id For Token  ${ctx}[plan][id]  ${ctx}[member_token]
    Should Be Equal As Numbers  ${p_after}[unit_price]  ${77.77}
