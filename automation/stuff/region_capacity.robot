*** Settings ***
Resource  stuff_opt.resource
Suite Setup  Prepare Sale and Buy
Suite Teardown  Run Keywords  Region Capacity Reset  AND  Clean Up Sale and Buy
*** Test Cases ***
Region Capacity CRUD
    [Teardown]  Region Capacity Reset
    ${region}  Add Region Capacity  一号区  ${2}
    Should Not Be Equal As Integers  ${region}[id]  ${0}
    @{regions}  Get Region Capacities
    Length Should Be  ${regions}  ${1}
    Should Be Equal As Strings  ${regions}[0][name]  一号区
    Should Be Equal As Integers  ${regions}[0][parking_count]  ${2}
    Add Region Stuff  ${region}[id]  ${test_stuff}[id]
    @{regions}  Get Region Capacities
    Length Should Be  ${regions}[0][stuff]  ${1}
    Should Be Equal As Integers  ${regions}[0][stuff][0][id]  ${test_stuff}[id]
    Del Region Stuff  ${test_stuff}[id]
    @{regions}  Get Region Capacities
    Length Should Be  ${regions}[0][stuff]  ${0}
    Del Region Capacity  ${region}[id]
    @{regions}  Get Region Capacities
    Length Should Be  ${regions}  ${0}

Auto Call On Check In
    [Teardown]  Run Keywords  Plan Reset  AND  Region Capacity Reset
    ${region}  Add Region Capacity  自动叫号区  ${1}
    Add Region Stuff  ${region}[id]  ${test_stuff}[id]
    ${plan}  Prepare Paid Plan  ${0}
    Check In A Plan  ${plan}  open_id=oid_auto_0
    ${plan}  Get Plan By Id  ${plan}[id]
    Should Not Be Empty  ${plan}[register_time]
    Should Not Be Empty  ${plan}[call_time]
    ${found_auto_call}  Set Variable  ${False}
    FOR  ${node}  IN  @{plan}[plan_histories]
        IF  '叫号' in $node['action_type'] and '自动' in $node['operator']
            ${found_auto_call}  Set Variable  ${True}
            Exit For Loop
        END
    END
    Should Be True  ${found_auto_call}

Auto Call Respects Parking Count
    [Teardown]  Run Keywords  Plan Reset  AND  Region Capacity Reset
    ${region}  Add Region Capacity  限容区  ${1}
    Add Region Stuff  ${region}[id]  ${test_stuff}[id]
    ${plan1}  Prepare Paid Plan  ${0}
    ${plan2}  Prepare Paid Plan  ${1}
    Check In A Plan  ${plan1}  open_id=oid_cap_0
    Sleep  1s
    Check In A Plan  ${plan2}  open_id=oid_cap_1
    ${plan1}  Get Plan By Id  ${plan1}[id]
    ${plan2}  Get Plan By Id  ${plan2}[id]
    Should Not Be Empty  ${plan1}[call_time]
    Should Not Contain  ${plan2}  call_time

Auto Call After Cancel Check In
    [Teardown]  Run Keywords  Plan Reset  AND  Region Capacity Reset
    ${region}  Add Region Capacity  过号叫号区  ${1}
    Add Region Stuff  ${region}[id]  ${test_stuff}[id]
    ${plan1}  Prepare Paid Plan  ${0}
    ${plan2}  Prepare Paid Plan  ${1}
    Check In A Plan  ${plan1}  open_id=oid_cancel_0
    Sleep  1s
    Check In A Plan  ${plan2}  open_id=oid_cancel_1
    ${plan1}  Get Plan By Id  ${plan1}[id]
    Should Not Be Empty  ${plan1}[call_time]
    Cancel Check In Plan  ${plan1}
    ${plan2}  Get Plan By Id  ${plan2}[id]
    Should Not Be Empty  ${plan2}[call_time]
    ${latest_node}  Get Latest History Node  ${plan2}
    Should Contain  ${latest_node}[action_type]  叫号
    Should Contain  ${latest_node}[operator]  自动

Auto Call After Deliver
    [Teardown]  Run Keywords  Plan Reset  AND  Region Capacity Reset
    ${region}  Add Region Capacity  出货叫号区  ${1}
    Add Region Stuff  ${region}[id]  ${test_stuff}[id]
    ${unit_price}  Set Variable  ${test_stuff}[price]
    ${plan1}  Prepare Paid Plan  ${0}
    ${plan2}  Prepare Paid Plan  ${1}
    Check In A Plan  ${plan1}  open_id=oid_deliver_0
    Sleep  1s
    Check In A Plan  ${plan2}  open_id=oid_deliver_1
    ${plan1}  Get Plan By Id  ${plan1}[id]
    Should Not Be Empty  ${plan1}[call_time]
    ${plan2}  Get Plan By Id  ${plan2}[id]
    Should Not Contain  ${plan2}  call_time
    Deliver A Plan  ${plan1}  ${20}
    ${plan2}  Get Plan By Id  ${plan2}[id]
    Should Not Be Empty  ${plan2}[call_time]
    ${latest_node}  Get Latest History Node  ${plan2}
    Should Contain  ${latest_node}[action_type]  叫号
    Should Contain  ${latest_node}[operator]  自动
    Charge To A Company  ${buy_company1}[id]  ${unit_price * 20}
