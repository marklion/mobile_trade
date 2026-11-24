*** Settings ***
Resource  stuff_opt.resource
Suite Setup  Prepare Sale and Buy
Suite Teardown  Clean Up Sale and Buy

*** Keywords ***
Dispatch Test Reset
    Plan Reset
    Clear Table  dispatch_config

Add Dispatch Config
    [Arguments]  ${stuff_id}  ${ticket_title}  ${ticket_prefix}  ${token}=${sc_admin_token}
    ${req}  Create Dictionary  stuff_id=${stuff_id}  ticket_title=${ticket_title}  ticket_prefix=${ticket_prefix}
    Req to Server  /stuff/add_dispatch_config  ${token}  ${req}
    ${stuff}  Get Stuff By Id  ${stuff_id}  ${token}
    ${configs}  Get From Dictionary  ${stuff}  dispatch_configs
    FOR  ${config}  IN  @{configs}
        IF  $config['ticket_title'] == $ticket_title
            RETURN  ${config}
        END
    END
    Fail  未找到新增的分劈配置

Dispatch Plan
    [Arguments]  ${plan_id}  ${dispatch_config_id}  ${expect_fail}=${False}
    ${req}  Create Dictionary  plan_id=${plan_id}  dispatch_config_id=${dispatch_config_id}
    ${resp}  Req to Server  /sale_management/dispatch  ${sc_admin_token}  ${req}  ${expect_fail}
    RETURN  ${resp}

Cancel Dispatch
    [Arguments]  ${plan_id}  ${expect_fail}=${False}
    ${req}  Create Dictionary  plan_id=${plan_id}
    ${resp}  Req to Server  /sale_management/cancel_dispatch  ${sc_admin_token}  ${req}  ${expect_fail}
    RETURN  ${resp}

Deliver Plan With External Ticket
    [Arguments]  ${plan}  ${ticket_no}
    ${p_time}  Get Current Date  result_format=%Y-%m-%d %H:%M:%S
    ${m_time}  Get Current Date  result_format=%Y-%m-%d %H:%M:%S
    ${req}  Create Dictionary  plan_id=${plan}[id]  p_weight=${10}  m_weight=${30}  count=${20}  p_time=${p_time}  m_time=${m_time}  ticket_no=${ticket_no}
    Req to Server  /scale/deliver  ${sc_admin_token}  ${req}

*** Test Cases ***
Dispatch Config Should Be Returned And Bound To Plan
    [Teardown]  Dispatch Test Reset
    ${config}  Add Dispatch Config  ${test_stuff}[id]  分劈公司A  DPA
    Should Be Equal As Strings  ${config}[ticket_prefix]  DPA
    ${plan}  Prepare Paid Plan
    Dispatch Plan  ${plan}[id]  ${config}[id]
    ${current_plan}  Get Plan By Id  ${plan}[id]
    Should Be Equal As Integers  ${current_plan}[stuff][dispatch_configs][0][id]  ${config}[id]
    Should Be Equal As Strings  ${current_plan}[stuff][dispatch_configs][0][ticket_prefix]  DPA
    Should Be Equal As Integers  ${current_plan}[dispatch_config][id]  ${config}[id]
    Should Be Equal As Strings  ${current_plan}[dispatch_config][ticket_title]  分劈公司A
    ${latest_node}  Get Latest History Node  ${current_plan}
    Should Contain  ${latest_node}[action_type]  分劈为分劈公司A
    ${req}  Create Dictionary  start_time=2018-01-01  end_time=2090-09-09
    ${brief_plans}  Req Get to Server  /sale_management/order_search_brief  ${sc_admin_token}  plans  -1  &{req}
    Should Be Equal As Integers  ${brief_plans}[0][dispatch_config][id]  ${config}[id]
    Should Be Equal As Strings  ${brief_plans}[0][dispatch_config][ticket_title]  分劈公司A

Cancel Dispatch Should Clear Config And Record History
    [Teardown]  Dispatch Test Reset
    ${config}  Add Dispatch Config  ${test_stuff}[id]  分劈公司A  DPA
    ${plan}  Prepare Paid Plan
    Dispatch Plan  ${plan}[id]  ${config}[id]
    Cancel Dispatch  ${plan}[id]
    ${current_plan}  Get Plan By Id  ${plan}[id]
    Dictionary Should Not Contain Key  ${current_plan}  dispatch_config
    ${latest_node}  Get Latest History Node  ${current_plan}
    Should Contain  ${latest_node}[action_type]  取消分劈
    ${req}  Create Dictionary  start_time=2018-01-01  end_time=2090-09-09
    ${brief_plans}  Req Get to Server  /sale_management/order_search_brief  ${sc_admin_token}  plans  -1  &{req}
    Dictionary Should Not Contain Key  ${brief_plans}[0]  dispatch_config

Dispatch Plan Should Reject Config From Another Stuff
    [Teardown]  Dispatch Test Reset
    ${config}  Add Dispatch Config  ${order_stuff}[id]  其他物料分劈公司  DPB
    ${plan}  Prepare Paid Plan
    ${error}  Dispatch Plan  ${plan}[id]  ${config}[id]  ${True}
    Should Contain  ${error}  分劈配置与计划物料不匹配
    ${current_plan}  Get Plan By Id  ${plan}[id]
    Dictionary Should Not Contain Key  ${current_plan}  dispatch_config

Closed Plan Cannot Dispatch
    [Teardown]  Dispatch Test Reset
    ${config}  Add Dispatch Config  ${test_stuff}[id]  分劈公司A  DPA
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${closed_plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Close A Plan  ${closed_plan}
    ${error}  Dispatch Plan  ${closed_plan}[id]  ${config}[id]  ${True}
    Should Contain  ${error}  已关闭计划不能分劈
    ${finished_plan}  Prepare Paid Plan  1
    Deliver A Plan  ${finished_plan}  ${20}
    ${error}  Dispatch Plan  ${finished_plan}[id]  ${config}[id]  ${True}
    Should Contain  ${error}  已关闭计划不能分劈

Dispatch Config Should Control Ticket Prefix And Sequence
    [Teardown]  Run Keywords  Set Stuff Ticket Prefix  ${test_stuff}[id]  ${sc_admin_token}  ${EMPTY}  AND  Dispatch Test Reset
    Set Stuff Ticket Prefix  ${test_stuff}[id]  ${sc_admin_token}  BASE
    ${config}  Add Dispatch Config  ${test_stuff}[id]  分劈公司A  DPA
    ${today}  Get Current Date  result_format=%Y%m%d
    ${normal_plan}  Prepare Paid Plan  0
    Deliver Plan With External Ticket  ${normal_plan}  EXT001
    ${normal_plan}  Get Plan By Id  ${normal_plan}[id]
    Should Be Equal As Strings  ${normal_plan}[ticket_no]  BASE${today}0001
    ${first_plan}  Prepare Paid Plan  1
    Dispatch Plan  ${first_plan}[id]  ${config}[id]
    Deliver Plan With External Ticket  ${first_plan}  EXT002
    ${first_plan}  Get Plan By Id  ${first_plan}[id]
    Should Be Equal As Strings  ${first_plan}[ticket_no]  DPA${today}0001
    ${second_plan}  Prepare Paid Plan  2
    Dispatch Plan  ${second_plan}[id]  ${config}[id]
    Deliver Plan With External Ticket  ${second_plan}  EXT003
    ${second_plan}  Get Plan By Id  ${second_plan}[id]
    Should Be Equal As Strings  ${second_plan}[ticket_no]  DPA${today}0002
