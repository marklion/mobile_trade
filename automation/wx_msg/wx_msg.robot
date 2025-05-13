*** Settings ***
Resource  ../stuff/stuff_opt.resource
Resource  ../safe_check/sc_opt.resource
Suite Setup  Run Keywords  Prepare For Msg Test  AND  Init Wx Msg Config
Suite Teardown  Clean Up Msg Test

*** Variables ***
${mv}
${bv}
${dv}
${plan_status}  ps
${call_vehicle}  cv
${scale_msg}  sm
${bidding_status}  bs
${sc_status}  ss

*** Test Cases ***
Plan Create Msg
    [Teardown]  Plan Reset
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Msg Verify    opid1234    ${plan_status}

Plan Confirm Msg
    [Teardown]  Plan Reset
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    ${x_token}  New User Login  17627928401  sc  chenxi123 
    #添加一个用户x
    Push Messages To Writable Roles  ${True}
    # 配置可写角色才能收到
    #添加一个只读角色A
    Add Role  ${sc_admin_token}  A  ${True}
    #添加一个可写角色B
    Add Role  ${sc_admin_token}  B  ${False}   
    Bind Role To Module  ${sc_admin_token}  A  sale_management
    Bind Role To Module  ${sc_admin_token}  B  sale_management
    #把x和A关联
    Bind Role To User  ${sc_admin_token}  A  17627928401
    Confirm A Plan  ${plan}
    #验证x收不到消息
    Msg Verify    chenxi123    ${plan_status}  ${True}
    #回退Plan
    Rollback Plan  ${plan}
    #把x和B关联
    Bind Role To User  ${sc_admin_token}  B  17627928401
    confirm A Plan  ${plan}
    #验证x收到了消息
    Msg Verify    chenxi123    ${plan_status}
    
Plan Deliver Msg
    [Teardown]  Plan Reset
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan    ${plan}
    Deliver A Plan  ${plan}  ${23}
    Msg Verify    2233    ${plan_status}

Call Vehicle Msg
    [Teardown]  Plan Reset
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan    ${plan}
    Check In A Plan    ${plan}
    Call A Plan    ${plan}
    Msg Verify  open_id_for_test  ${call_vehicle}

Ticket Msg
    [Teardown]  Plan Reset
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan    ${plan}
    Check In A Plan    ${plan}
    Call A Plan    ${plan}
    Deliver A Plan  ${plan}  ${23}
    WxMsg Catch
    WxMsg was recieved    open_id_for_test    ${scale_msg}
    WxMsg was recieved    2233    ${scale_msg}

SC Check Msg
    [Setup]  Enable Stuff SC  ${test_stuff}[id]
    [Teardown]  Plan Reset
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan    ${plan}
    ${resp}  Driver Get SC Status  ${plan}
    FOR  ${itr}  IN  @{resp}
        Driver Upload SC Content  ${plan}  ${itr}[id]
    END
    Msg Verify    opid1234    ${sc_status}
    Check Pass SC Status By Index  ${plan}  0
    Msg Verify    open_id_for_test   ${sc_status}
    Check Pass SC Status By Index  ${plan}  0  ${False}
    Msg Verify    open_id_for_test   ${sc_status}
    
*** Keywords ***
Prepare For Msg Test
    Prepare Sale and Buy
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    Set Suite Variable    ${mv}
    Set Suite Variable    ${bv}
    Set Suite Variable    ${dv}
    Disable Stuff SC    ${test_stuff}[id]
    Fetch SC Req  ${test_stuff}[id]  s1  ${True}  ${True}  ${True}  ${0}

Clean Up Msg Test
    SC Reset
    Clean Up Sale and Buy

Msg Verify
    [Arguments]  ${open_id}  ${msg_id}  ${no_msg}=${False}
    WxMsg Catch
    WxMsg was recieved    ${open_id}    ${msg_id}    ${no_msg}

Init Wx Msg Config
    ${req}  Create Dictionary  plan_status=${plan_status}  call_vehicle=${call_vehicle}  scale_msg=${scale_msg}  bidding_status=${bidding_status}  sc_status=${sc_status}
    Req to Server    /global/set_wx_msg_config    admin_token    ${req}
Push Messages To Writable Roles
    [Arguments]   ${push_messages_writable_roles}  ${token}=${sc_admin_token} 
    ${req}  Create Dictionary  push_messages_writable_roles=${push_messages_writable_roles}
    Req to Server    /stuff/set_push_messages_writable_roles    ${token}    ${req}