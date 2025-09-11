*** Settings ***
Resource  stuff_opt.resource
Suite Setup  Prepare Sale and Buy
Suite Teardown  Clean Up Sale and Buy
*** Test Cases ***
Order Create and Check
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${order}  Create A Order  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Search And Verify Order   ${mv}  ${bv}  ${dv}  ${order}[id]  0
    Search By Plate Or Id    ${sc_admin_token}    ${mv}[plate]    ${dv}[id_card]    ${False}
Plan Create and Check
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Search And Verify Plan  ${mv}  ${bv}  ${dv}  ${plan}[id]  0
    Search By Plate Or Id    ${sc_admin_token}    ${mv}[plate]    ${dv}[id_card]    ${False}
Order Confirm
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Order  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Order  ${plan}
    Search And Verify Order  ${mv}  ${bv}  ${dv}  ${plan}[id]  1
    Search By Plate Or Id    ${sc_admin_token}    ${mv}[plate]    ${dv}[id_card]    ${True}
Plan Confirm with No Cash and Check
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Search And Verify Plan  ${mv}  ${bv}  ${dv}  ${plan}[id]  1
    Search By Plate Or Id    ${sc_admin_token}    ${mv}[plate]    ${dv}[id_card]    ${False}
Plan Confirm with Enough Cash and Check
    [Teardown]  Plan Reset
    ${unit_price}  Set Variable  ${test_stuff}[price]
    Charge To A Company  ${buy_company1}[id]  ${unit_price * 22}
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Search And Verify Plan  ${mv}  ${bv}  ${dv}  ${plan}[id]  2
    Charge To A Company  ${buy_company1}[id]  ${unit_price * -22}
    Search By Plate Or Id    ${sc_admin_token}    ${mv}[plate]    ${dv}[id_card]    ${True}
Plan Confirm with Not Enough Cash and Check
    [Teardown]  Plan Reset
    ${unit_price}  Set Variable  ${test_stuff}[price]
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Search And Verify Plan  ${mv}  ${bv}  ${dv}  ${plan}[id]  1
    Search By Plate Or Id    ${sc_admin_token}    ${mv}[plate]    ${dv}[id_card]    ${False}
    # 获取订单中的欠款额
    ${data_plan}  Get Plan By Id  ${plan}[id]
    ${arrears_first}  Get From Dictionary  ${data_plan}  arrears  false
    ${first_outstanding_vehicles}  Get From Dictionary  ${data_plan}  outstanding_vehicles  false
    # 计算欠款额应该是多少：b = ${plan}[unit_price] * ${test_stuff}[expect_count]
    Should Be Equal As Numbers    ${first_outstanding_vehicles}  ${1}
    ${test_stuff_id}  Get From Dictionary  ${test_stuff}  id
    ${data_stuff}  Get Stuff By Id  ${test_stuff_id}
    ${expr}  Set Variable  ${plan}[unit_price] * ${data_stuff}[expect_count]
    ${a}   Evaluate  ${expr}
    # 比较计算结果与实际值
    Should Be Equal As Numbers    ${arrears_first}    ${a}
    Manual Pay A Plan    ${plan}
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Search And Verify Plan  ${mv}  ${bv}  ${dv}  ${plan}[id]  1
    Search By Plate Or Id    ${sc_admin_token}    ${mv}[plate]    ${dv}[id_card]    ${True}
    # 获取订单中的欠款额
    ${data_plan}  Get Plan By Id  ${plan}[id]
    ${arrears_second}  Get From Dictionary  ${data_plan}  arrears  false
    # 计算欠款额应该是多少：b = ${plan}[unit_price] * ${test_stuff}[expect_count]
    ${second_outstanding_vehicles}  Get From Dictionary  ${data_plan}  outstanding_vehicles  false
    Should Be Equal As Numbers    ${second_outstanding_vehicles}  ${2}
    ${test_stuff_id}  Get From Dictionary  ${test_stuff}  id
    ${data_stuff}  Get Stuff By Id  ${test_stuff_id}
    ${expr}  Set Variable  ${plan}[unit_price] * ${data_stuff}[expect_count] * 2
    ${b}   Evaluate  ${expr}
    # 比较计算结果与实际值
    Should Be Equal As Numbers    ${arrears_second}    ${b}
    Manual Pay A Plan    ${plan}
    Deliver A Plan    ${plan}    ${20}
    ${unit_price}  Set Variable  ${test_stuff}[price]
    Charge To A Company  ${buy_company1}[id]  ${unit_price * 20}
    ${data_plan}  Get Plan By Id  ${plan}[id]
    ${arrears_third}  Get From Dictionary  ${data_plan}  arrears  false
    ${third_outstanding_vehicles}  Get From Dictionary  ${data_plan}  outstanding_vehicles  false
    Should Be Equal As Numbers    ${third_outstanding_vehicles}  ${0}
    # 计算欠款额应该是多少：b = ${plan}[unit_price] * ${test_stuff}[expect_count]
    ${test_stuff_id}  Get From Dictionary  ${test_stuff}  id
    ${data_stuff}  Get Stuff By Id  ${test_stuff_id}
    ${c}  Set Variable  ${0}
    # 比较计算结果与实际值
    Should Be Equal As Numbers    ${arrears_third}    ${c}

Plan Price Change With Recalculation
    [Teardown]  Plan Reset
    ${unit_price}  Set Variable  ${test_stuff}[price]
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    # 获取确认后的欠款信息
    ${data_plan}  Get Plan By Id  ${plan}[id]
    ${original_arrears}  Get From Dictionary  ${data_plan}  arrears  false
    ${original_outstanding_vehicles}  Get From Dictionary  ${data_plan}  outstanding_vehicles  false
    ${original_unit_price}  Get From Dictionary  ${data_plan}  unit_price
    ${test_stuff_id}  Get From Dictionary  ${test_stuff}  id
    ${data_stuff}  Get Stuff By Id  ${test_stuff_id}
    ${expected_original_arrears}  Evaluate  ${original_unit_price} * ${data_stuff}[expect_count]
    Should Be Equal As Numbers    ${original_arrears}    ${expected_original_arrears}
    Should Be Equal As Numbers    ${original_outstanding_vehicles}  ${1}
    
    # 改价为更高的价格
    ${new_price}  Evaluate  ${original_unit_price} * 1.5
    ${plan_id_string}  Convert To String    ${plan}[id]
    ${req}=    Create Dictionary    unit_price=${new_price}  plan_id=${plan_id_string}  comment=测试改价重新计算
    ${resp}=    Req to Server    /stuff/change_price_by_plan    ${sc_admin_token}  ${req}
    Sleep    1s
    ${data_plan_after}  Get Plan By Id  ${plan}[id]
    ${new_arrears}  Get From Dictionary  ${data_plan_after}  arrears  false
    ${new_outstanding_vehicles}  Get From Dictionary  ${data_plan_after}  outstanding_vehicles  false
    ${new_unit_price}  Get From Dictionary  ${data_plan_after}  unit_price
    
    # 验证价格已更新
    Should Be Equal As Numbers    ${new_unit_price}    ${new_price}
    ${expected_new_arrears}  Evaluate  ${new_price} * ${data_stuff}[expect_count]
    Should Be Equal As Numbers    ${new_arrears}    ${expected_new_arrears}
    Should Be Equal As Numbers    ${new_outstanding_vehicles}  ${1}
    
    # 验证新欠款大于原欠款（因为涨价了）
    Should Be True    ${new_arrears} > ${original_arrears}
    Charge To A Company  ${buy_company1}[id]  ${expected_new_arrears}
    ${data_plan_final}  Get Plan By Id  ${plan}[id]
    ${final_arrears}  Get From Dictionary  ${data_plan_final}  arrears  false
    ${final_outstanding_vehicles}  Get From Dictionary  ${data_plan_final}  outstanding_vehicles  false
    Should Be Equal As Numbers    ${final_arrears}    ${0}
    Should Be Equal As Numbers    ${final_outstanding_vehicles}  ${0}
    ${negative_amount}  Evaluate  -${expected_new_arrears}
    Charge To A Company  ${buy_company1}[id]  ${negative_amount}

Plan Confirm with No User Authorized
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    Unauthorize User to Contract  ${buy_company1}[name]  5678
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    ${req}  Create Dictionary  plan_id=${plan}[id]
    Req to Server  /sale_management/order_sale_confirm  ${sc_admin_token}  ${req}  ${True}
    Authorize User to Contract  ${buy_company1}[name]  5678

Charge After Plan Confirmed
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    ${unit_price}  Set Variable  ${test_stuff}[price]
    Charge To A Company  ${buy_company1}[id]  ${unit_price * 22}
    Search And Verify Plan  ${mv}  ${bv}  ${dv}  ${plan}[id]  2
    Charge To A Company  ${buy_company1}[id]  ${unit_price * -22}
Manual Verify Payment
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan  ${plan}
    Search And Verify Plan  ${mv}  ${bv}  ${dv}  ${plan}[id]  2

Driver Check In
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan  ${plan}
    Check In A Plan  ${plan}
    ${dv}  Search Driver by Index  0
    Search And Verify Plan  ${mv}  ${bv}  ${dv}  ${plan}[id]  2  ${True}
    Close A Plan  ${plan}
    ${plan}  Create A Order  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Order  ${plan}
    Check In A Plan  ${plan}
    Search And Verify Order  ${mv}  ${bv}  ${dv}  ${plan}[id]  1  ${True}

Driver Check In with Delay
    [Teardown]  Plan Reset
    ${today}  Get Current Date  result_format=%Y-%m-%d
    ${yesterday}  Subtract Time From Date    ${today}  1 day  result_format=%Y-%m-%d
    ${the_day_before_yesterday}  Subtract Time From Date    ${today}  2 day  result_format=%Y-%m-%d
    ${tomorrow}  Add Time To Date  ${today}  1 day  result_format=%Y-%m-%d
    ${plan}  Prepare Plan For Check In    ${the_day_before_yesterday}
    Check In A Plan    ${plan}  ${True}
    Close A Plan    ${plan}
    ${plan}  Prepare Plan For Check In    ${yesterday}
    Check In A Plan    ${plan}
    Cancel Check In Plan    ${plan}
    Close A Plan    ${plan}
    ${plan}  Prepare Plan For Check In    ${today}
    Check In A Plan    ${plan}
    Cancel Check In Plan    ${plan}
    Close A Plan    ${plan}
    ${plan}  Prepare Plan For Check In    ${tomorrow}
    Check In A Plan    ${plan}  ${True}
    Close A Plan    ${plan}


Driver Set Expect Weight
    [Setup]  Set Stuff Need Expect Weight
    [Teardown]  Run Keywords  Plan Reset  AND  Set Stuff Need Expect Weight  expect_weight=${False}
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan  ${plan}
    Check In A Plan  ${plan}  expect_fail=${True}
    Set Expect Weight  ${plan}  ${34}
    Check In A Plan  ${plan}
    ${plan}  Get Plan By Id  ${plan}[id]
    Should Be Equal As Numbers    ${plan}[expect_weight]  ${34}
    Deliver A Plan  ${plan}  ${23}
    Set Expect Weight  ${plan}  ${34}  ${True}

Plan Enter and Check
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan  ${plan}
    Plan Enter  ${plan}
    Search And Verify Plan  ${mv}  ${bv}  ${dv}  ${plan}[id]  2  ${False}  ${True}
    ${plan}  Create A Order  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Order  ${plan}
    Plan Enter  ${plan}
    Search And Verify Order  ${mv}  ${bv}  ${dv}  ${plan}[id]  1  ${False}  ${True}

Deliver Order And Check
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Order  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Order  ${plan}
    Check In A Plan  ${plan}
    ${dv}  Search Driver by Index  0
    Plan Enter  ${plan}
    Deliver A Plan  ${plan}  ${23}
    Search And Verify Order  ${mv}  ${bv}  ${dv}  ${plan}[id]  3  ${True}
    Del A Stuff From Sale  ${order_stuff}[id]
    Search And Verify Order  ${mv}  ${bv}  ${dv}  ${plan}[id]  3  ${True}
    Re-Add Stuff
Deliver Plan And Check
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${orig_balance}  Get Cash Of A Company  ${buy_company1}[name]
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan  ${plan}
    Check In A Plan  ${plan}
    ${dv}  Search Driver by Index  0
    Plan Enter  ${plan}
    Deliver A Plan  ${plan}  ${23}
    Search And Verify Plan  ${mv}  ${bv}  ${dv}  ${plan}[id]  3  ${True}
    ${cur_balance}  Get Cash Of A Company  ${buy_company1}[name]
    ${single_cost}  Set Variable  ${plan}[unit_price]
    ${single_cost}  Set Variable  ${single_cost * 23}
    ${expect_balance}  Evaluate  $orig_balance - $single_cost
    Should Be Equal  ${expect_balance}  ${cur_balance}
    Del A Stuff From Sale  ${test_stuff}[id]
    Search And Verify Plan  ${mv}  ${bv}  ${dv}  ${plan}[id]  3  ${True}
    Re-Add Stuff

Deliver Plan With Delay Checkout
    [Setup]  Set Stuff Checkout Delay
    [Teardown]  Run Keywords  Plan Reset  AND  Set Stuff Checkout Delay  delay=${False}
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${orig_balance}  Get Cash Of A Company  ${buy_company1}[name]
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan  ${plan}
    Check In A Plan  ${plan}
    ${dv}  Search Driver by Index  0
    Plan Enter  ${plan}
    Deliver A Plan  ${plan}  ${23}
    Search And Verify Plan  ${mv}  ${bv}  ${dv}  ${plan}[id]  2  ${True}
    ${cur_balance}  Get Cash Of A Company  ${buy_company1}[name]
    ${single_cost}  Set Variable  ${plan}[unit_price]
    ${single_cost}  Set Variable  ${single_cost * 23}
    ${expect_balance}  Evaluate  $orig_balance - $single_cost
    Should Not Be Equal  ${expect_balance}  ${cur_balance}
    Checkout A Plan    ${plan}
    Search And Verify Plan  ${mv}  ${bv}  ${dv}  ${plan}[id]  3  ${True}
    ${cur_balance}  Get Cash Of A Company  ${buy_company1}[name]
    Should Be Equal  ${expect_balance}  ${cur_balance}

Batch Checkout Test
    [Setup]  Set Stuff Checkout Delay Time    10:10:23
    [Teardown]  Run Keywords  Plan Reset  AND  Set Stuff Checkout Delay Time  ${EMPTY}  AND  Set Stuff Checkout Delay  delay=${False}
    ${orig_balance}  Get Cash Of A Company  ${buy_company1}[name]
    ${plan}  Go Deliver Plan    ${10}
    ${cur_balance}  Get Cash Of A Company  ${buy_company1}[name]
    Should Be Equal As Numbers    ${cur_balance}    ${orig_balance}
    ${single_cost}  Set Variable  ${plan}[unit_price]
    ${single_cost}  Set Variable  ${single_cost * 10}
    ${expect_balance}  Evaluate  $orig_balance - $single_cost
    Batch Checkout  ${test_stuff}[id]
    ${cur_balance}  Get Cash Of A Company  ${buy_company1}[name]
    Should Be Equal As Numbers    ${cur_balance}    ${expect_balance}

Batch Checkout With Timer
    [Teardown]  Run Keywords  Plan Reset  AND  Set Stuff Checkout Delay Time  ${EMPTY}  AND  Set Stuff Checkout Delay  delay=${False}
    ${now_time}  Get Current Date  increment=1m  result_format=%H:%M:%S
    Set Stuff Checkout Delay Time    ${now_time}
    ${orig_balance}  Get Cash Of A Company  ${buy_company1}[name]
    Go Deliver Plan    ${6.5}
    Go Deliver Plan    ${6.5}
    Go Deliver Plan    ${6.5}
    ${cur_balance}  Get Cash Of A Company  ${buy_company1}[name]
    Should Be Equal    ${orig_balance}    ${cur_balance}
    Sleep    2m
    ${plan}  Go Deliver Plan    ${6.5}
    Sleep    2m
    ${cur_balance}  Get Cash Of A Company  ${buy_company1}[name]
    ${single_cost}  Set Variable  ${plan}[unit_price]
    ${single_cost}  Set Variable  ${single_cost * 6.5}
    ${expect_balance}  Evaluate  $orig_balance - $single_cost * 3
    Should Be Equal As Numbers    ${cur_balance}    ${expect_balance}

Lots of Plan Explore
    [Teardown]  Plan Reset
    @{plans_need_next}  Create List
    FOR  ${itr}  IN RANGE  0  100
        ${mv}  Search Main Vehicle by Index  ${itr}
        ${bv}  Search behind Vehicle by Index  ${itr}
        ${dv}  Search Driver by Index  ${itr}
        ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
        ${plan_id}  Get From Dictionary  ${plan}  id
        IF  $plan_id % 10 >= 3
            Append To List  ${plans_need_next}  ${plan}
        END
    END
    ${after_confirm_count}  Get Length  ${plans_need_next}
    @{el}  Create List
    FOR  ${plan}  IN  @{plans_need_next}
        Confirm A Plan  ${plan}
        ${plan_id}  Get From Dictionary  ${plan}  id
        IF  $plan_id % 10 >= 5
            Append To List  ${el}  ${plan}
        END
    END
    ${plans_need_next}  Copy List  ${el}
    ${after_pay_count}  Get Length  ${plans_need_next}
    @{el}  Create List
    FOR  ${plan}  IN  @{plans_need_next}
        Manual Pay A Plan  ${plan}
        ${plan_id}  Get From Dictionary  ${plan}  id
        IF  $plan_id % 10 >= 7
            Append To List  ${el}  ${plan}
        END
    END
    ${plans_need_next}  Copy List  ${el}
    ${after_deliver_count}  Get Length  ${plans_need_next}
    @{el}  Create List
    FOR  ${plan}  IN  @{plans_need_next}
        ${plan_id}  Get From Dictionary  ${plan}  id
        Deliver A Plan  ${plan}  ${plan_id}
    END
    ${only_create_count}  Evaluate  100 - $after_confirm_count
    ${only_confirm_count}  Evaluate  $after_confirm_count - $after_pay_count
    ${only_pay_count}  Evaluate  $after_pay_count - $after_deliver_count

    ${resp}  Search Plans Based on User  ${bc1_user_token}  ${False}  ${0}
    Length Should Be  ${resp}  ${only_create_count}
    ${resp}  Search Plans Based on User  ${sc_admin_token}  ${True}  ${0}
    Length Should Be  ${resp}  ${only_create_count}

    ${resp}  Search Plans Based on User  ${bc1_user_token}  ${False}  ${1}
    Length Should Be  ${resp}  ${only_confirm_count}
    ${resp}  Search Plans Based on User  ${sc_admin_token}  ${True}  ${1}
    Length Should Be  ${resp}  ${only_confirm_count}

    ${resp}  Search Plans Based on User  ${bc1_user_token}  ${False}  ${2}
    Length Should Be  ${resp}  ${only_pay_count}
    ${resp}  Search Plans Based on User  ${sc_admin_token}  ${True}  ${2}
    Length Should Be  ${resp}  ${only_pay_count}

    ${resp}  Search Plans Based on User  ${bc1_user_token}  ${False}  ${3}
    Length Should Be  ${resp}  ${after_deliver_count}
    ${resp}  Search Plans Based on User  ${sc_admin_token}  ${True}  ${3}
    Length Should Be  ${resp}  ${after_deliver_count}

    ${resp}  Search Plans Based on User  ${bc1_user_token}  ${False}
    Length Should Be  ${resp}  100
    ${resp}  Search Plans Based on User  ${sc_admin_token}  ${True}
    Length Should Be  ${resp}  100

Directly Change Stuff Price With Plan Openned
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Change Stuff Price  ${test_stuff}[id]  ${1090}
    @{stuffs_found}  Req Get to Server  /customer/get_stuff_on_sale  ${bc1_user_token}  stuff
    Set Suite Variable  ${test_stuff}  ${stuffs_found}[0]
    ${plan}  Get Plan By Id  ${plan}[id]
    Should Not Be Equal As Numbers  ${plan}[unit_price]  ${test_stuff}[price]
    Change Stuff Price  ${test_stuff}[id]  ${998}  ${True}
    @{stuffs_found}  Req Get to Server  /customer/get_stuff_on_sale  ${bc1_user_token}  stuff
    Set Suite Variable  ${test_stuff}  ${stuffs_found}[0]
    ${plan}  Get Plan By Id  ${plan}[id]
    Should Be Equal As Numbers  ${plan}[unit_price]  ${test_stuff}[price]
    ${last_node}  Get Latest History Node  ${plan}
    Should Contain  ${last_node}[action_type]  998
    Change Stuff Price  ${test_stuff}[id]  ${1211}  ${True}

Change Price After Plan Closed
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan  ${plan}
    Deliver A Plan  ${plan}  ${23}
    ${plan}  Get Plan By Id  ${plan}[id]
    Change Stuff Price  ${test_stuff}[id]  ${998}  ${True}
    Should Not Be Equal As Numbers  ${plan}[unit_price]  ${998}

Auto Uncheck In
    [Teardown]  Plan Reset
    #设定自动取消排号时间为1分钟
    Set Check In Stay Minutes  ${1}
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    ${plan_id}  Get From Dictionary  ${plan}  id
    Confirm A Plan  ${plan}
    Manual Pay A Plan  ${plan}
    Check In A Plan  ${plan}
    #不叫号，检查过三分钟后是否被过号了
    ${plan}  Get Plan By Id  ${plan_id}
    Should Not Be Empty    ${plan}[register_time]
    Sleep  70s
    ${plan}  Get Plan By Id  ${plan_id}
    Should Contain    ${plan}    register_time
    Call A Plan    ${plan}
    #叫号，然后检查过三分钟后是否被过号了
    ${plan}  Get Plan By Id  ${plan_id}
    Should Not Be Empty    ${plan}[register_time]
    Sleep  70s
    ${plan}  Get Plan By Id  ${plan_id}
    Should Not Contain    ${plan}    register_time
    #关闭自动排号并再次排号
    Set Check In Stay Minutes
    #检查过三分钟后是否被过号了
    Check In A Plan  ${plan}
    Call A Plan    ${plan}
    ${plan}  Get Plan By Id  ${plan_id}
    Should Not Be Empty    ${plan}[register_time]
    Sleep  70s
    ${plan}  Get Plan By Id  ${plan_id}
    Should Not Be Empty    ${plan}[register_time]

Input And Check Sct Info
    [Teardown]  Plan Reset
    Set Stuff Manual Weight
    Add Sct Scale Item    ${test_stuff}[id]    ssi1
    Add Sct Scale Item    ${test_stuff}[id]    ssi2
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    ${plan_id}  Get From Dictionary  ${plan}  id  id
    Confirm A Plan  ${plan}
    Manual Pay A Plan    ${plan}
    ${plan}  Get Plan By Id    ${plan}[id]
    ${psi}  Get From Dictionary    ${plan}    plan_sct_infos    abc
    Length Should Be    ${psi}    2
    Should Be Empty   ${psi}[0][value]
    Should Be Equal As Strings    ${psi}[1][sct_scale_item][name]    ssi2
    Input Plan Sct Info    ${plan_id}    ${psi}[0][id]    abc
    Input Plan Sct Info    ${plan_id}    ${psi}[1][id]    def
    ${plan}  Get Plan By Id    ${plan}[id]
    ${psi}  Get From Dictionary    ${plan}    plan_sct_infos    abc
    Length Should Be    ${psi}    2
    Should Be Equal As Strings    ${psi}[0][value]  abc
    Should Be Equal As Strings    ${psi}[1][value]  def

Input And Check Stuff Unit Coefficient
    [Teardown]  Plan Reset
    Set Stuff Second Unit Coefficient  ${test_stuff}[id]  千克  ${1.5}
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    ${plan_id}  Get From Dictionary  ${plan}  id  id
    Confirm A Plan  ${plan}
    Manual Pay A Plan  ${plan}
    Deliver A Plan  ${plan}  ${45}
    ${req_body}  Create Dictionary  id=${plan_id}
    ${p_resp}  Req to Server  /global/get_ticket  ${sc_admin_token}  ${req_body}
    Should Be Equal As Numbers  ${p_resp}[coefficient]  ${1.5}
    Should Be Equal As Strings  ${p_resp}[second_unit]  千克

Auto confirm Goods With Plan
    [Teardown]  Plan Reset
    Set Auto Confirm Goods
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    ${plan_id}  Get From Dictionary  ${plan}  id  id
    Confirm A Plan  ${plan}
    Manual Pay A Plan    ${plan}
    Check Plan Was Confirmed  ${plan_id}  ${False}
    Plan Enter  ${plan}
    Check Plan Was Confirmed  ${plan_id}  ${True}

Extra Info Set Test
    [Teardown]  Run Keywords  Plan Reset  AND  Extra Info Reset
    Add Extra Info Config    t1
    Add Extra Info Config    t2
    ${plan}  Go Deliver Plan    ${20}
    ${ei_configs}  Get Extra Info Config from Plan    ${plan}
    Set Extra Info to Plan    ${plan}[id]    ${ei_configs}[0][id]    c2
    ${plan}  Get Plan By Id    ${plan}[id]
    ${ei_contents}  Get Extra Info Content from Plan    ${plan}
    ${ticket}  Get Ticket by Plan Id    ${plan}[id]
    ${c2_plan}  Set Variable  ${ei_contents}[0]
    ${c2_ticket}  Set Variable   ${ticket}[extra_infos][0]
    Should Be Equal As Strings    ${c2_plan}[content]  c2
    Should Be Equal As Strings    ${c2_plan}[extra_info_config][title]  t2
    Should Be Equal As Strings    ${c2_ticket}[content]    c2
    Should Be Equal As Strings    ${c2_ticket}[title]    t2

*** Keywords ***
Get Ticket by Plan Id
    [Arguments]  ${plan_id}  ${token}=${sc_admin_token}
    ${req_body}  Create Dictionary  id=${plan_id}
    ${p_resp}  Req to Server  /global/get_ticket  ${token}  ${req_body}
    RETURN  ${p_resp}
Get Extra Info Content from Plan
    [Arguments]  ${plan}
    RETURN  ${plan}[extra_info_contents]
Get Extra Info Config from Plan
    [Arguments]  ${plan}
    RETURN  ${plan}[stuff][company][extra_info_configs]
Go Deliver Plan
    [Arguments]  ${count}
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan  ${plan}
    Deliver A Plan    ${plan}    ${count}
    ${plan}  Get Plan By Id    ${plan}[id]
    RETURN  ${plan}
Verify Order Detail
    [Arguments]  ${plan}  ${mv}  ${bv}  ${dv}  ${price}  ${status}  ${stuff_name}  ${check_in_time}=${False}  ${enter_check}=${False}
    Should Be Equal As Strings  ${plan}[behind_vehicle][plate]  ${bv}[plate]
    Should Be Equal As Strings  ${plan}[main_vehicle][plate]  ${mv}[plate]
    Should Be Equal As Strings  ${plan}[driver][id_card]  ${dv}[id_card]
    Should Be Equal As Numbers  ${plan}[unit_price]  ${price}
    Should Be Equal As Integers  ${plan}[status]  ${status}
    IF  $check_in_time
        Should Not Be Empty  ${plan}[register_time]
    END

    ${history}  Copy List  ${plan}[plan_histories]
    Reverse List  ${history}
    IF  ${status} >= 0
        ${found_node}  Set Variable  ${False}
        FOR  ${itr}  IN  @{history}
            ${action}  Get From Dictionary  ${itr}  action_type
            IF  $action == '创建'
                Should Be Equal As Strings  ${itr}[operator]  bu1
                ${found_node}  Set Variable  ${True}
            END
        END
        Should Be True  ${found_node}
    END
    IF  ${status} >= 1
        ${found_node}  Set Variable  ${False}
        FOR  ${itr}  IN  @{history}
            ${action}  Get From Dictionary  ${itr}  action_type
            IF  $action == '确认'
                Should Be Equal As Strings  ${itr}[operator]  sc_admin
                ${found_node}  Set Variable  ${True}
            END
        END
        Should Be True  ${found_node}
    END
    IF  ${status} >= 3
        ${found_node}  Set Variable  ${False}
        FOR  ${itr}  IN  @{history}
            ${action}  Get From Dictionary  ${itr}  action_type
            IF  $action == '发车'
                ${found_node}  Set Variable  ${True}
                Should Be Equal As Strings  ${itr}[operator]  sc_admin
            END
        END
        Should Be True  ${found_node}
    END
    IF  $enter_check
        Should Not Be Empty  ${plan}[enter_time]
        ${found_node}  Set Variable  ${False}
        FOR  ${itr}  IN  @{history}
            ${action}  Get From Dictionary  ${itr}  action_type
            IF  $action == '进厂'
                ${found_node}  Set Variable  ${True}
                Should Be Equal As Strings  ${itr}[operator]  sc_admin
            END
        END
        Should Be True  ${found_node}
    END
Check Plan Was Confirmed
    [Arguments]  ${plan_id}  ${is_confirm}=${True}
    ${focus_plan}  Get Plan By Id  ${plan_id}
    ${check_confirm}  Get From Dictionary  ${focus_plan}  confirmed  ${False}
    Should Be Equal  ${check_confirm}  ${is_confirm}
Verify Plan Detail
    [Arguments]  ${plan}  ${mv}  ${bv}  ${dv}  ${price}  ${status}  ${stuff_name}  ${check_in_time}=${False}  ${enter_check}=${False}
    Should Be Equal As Strings  ${plan}[behind_vehicle][plate]  ${bv}[plate]
    Should Be Equal As Strings  ${plan}[main_vehicle][plate]  ${mv}[plate]
    Should Be Equal As Strings  ${plan}[driver][id_card]  ${dv}[id_card]
    Should Be Equal As Numbers  ${plan}[unit_price]  ${price}
    Should Be Equal As Integers  ${plan}[status]  ${status}
    IF  $check_in_time
        Should Not Be Empty  ${plan}[register_time]
    END

    ${history}  Copy List  ${plan}[plan_histories]
    Reverse List  ${history}
    IF  ${status} >= 0
        ${found_node}  Set Variable  ${False}
        FOR  ${itr}  IN  @{history}
            ${action}  Get From Dictionary  ${itr}  action_type
            IF  $action == '创建'
                Should Be Equal As Strings  ${itr}[operator]  bu1
                ${found_node}  Set Variable  ${True}
            END
        END
        Should Be True  ${found_node}
    END
    IF  ${status} >= 1
        ${found_node}  Set Variable  ${False}
        FOR  ${itr}  IN  @{history}
            ${action}  Get From Dictionary  ${itr}  action_type
            IF  $action == '确认'
                Should Be Equal As Strings  ${itr}[operator]  sc_admin
                ${found_node}  Set Variable  ${True}
            END
        END
        Should Be True  ${found_node}
    END
    IF  ${status} >= 2
        ${found_node}  Set Variable  ${False}
        FOR  ${itr}  IN  @{history}
            ${action}  Get From Dictionary  ${itr}  action_type
            IF  $action == '验款'
                ${found_node}  Set Variable  ${True}
            END
        END
        Should Be True  ${found_node}
    END
    IF  ${status} >= 3
        ${found_node}  Set Variable  ${False}
        FOR  ${itr}  IN  @{history}
            ${action}  Get From Dictionary  ${itr}  action_type
            IF  $action == '发车'
                ${found_node}  Set Variable  ${True}
                Should Be Equal As Strings  ${itr}[operator]  sc_admin
            END
        END
        Should Be True  ${found_node}
        ${found_node}  Set Variable  ${False}
        FOR  ${itr}  IN  @{history}
            ${action}  Get From Dictionary  ${itr}  action_type
            IF  $action == '结算'
                ${found_node}  Set Variable  ${True}
            END
        END
        Should Be True  ${found_node}
    END
    IF  $enter_check
        Should Not Be Empty  ${plan}[enter_time]
        ${found_node}  Set Variable  ${False}
        FOR  ${itr}  IN  @{history}
            ${action}  Get From Dictionary  ${itr}  action_type
            IF  $action == '进厂'
                ${found_node}  Set Variable  ${True}
                Should Be Equal As Strings  ${itr}[operator]  sc_admin
            END
        END
        Should Be True  ${found_node}
    END

Search And Verify Order
    [Arguments]  ${mv}  ${bv}  ${dv}  ${plan_id}  ${status}  ${check_in_time}=${False}  ${enter_check}=${False}
    ${resp}  Search Orders Based on User  ${bc2_user_token}  ${True}
    Length Should Be  ${resp}  0
    ${resp}  Search Orders Based on User  ${sc_admin_no_need_token}  ${False}
    Length Should Be  ${resp}  0
    ${resp}  Search Orders Based on User  ${bc1_user_token}  ${True}
    ${plan}  Create Dictionary
    FOR  ${itr}  IN  @{resp}
        ${plan_found_id}  Get From Dictionary  ${itr}  id
        IF  $plan_found_id == $plan_id
            ${plan}  Set To Dictionary  ${itr}
            Exit For Loop
        END
    END
    Verify Order Detail  ${plan}  ${mv}  ${bv}  ${dv}  ${23}  ${status}  ${order_stuff}[name]  ${check_in_time}  ${enter_check}
    ${resp}  Search Orders Based on User  ${sc_admin_token}  ${False}
    ${plan}  Create Dictionary
    FOR  ${itr}  IN  @{resp}
        ${plan_found_id}  Get From Dictionary  ${itr}  id
        IF  $plan_found_id == $plan_id
            ${plan}  Set To Dictionary  ${itr}
            Exit For Loop
        END
    END
    Verify Order Detail  ${plan}  ${mv}  ${bv}  ${dv}  ${23}  ${status}  ${order_stuff}[name]  ${check_in_time}  ${enter_check}


Search And Verify Plan
    [Arguments]  ${mv}  ${bv}  ${dv}  ${plan_id}  ${status}  ${check_in_time}=${False}  ${enter_check}=${False}
    ${resp}  Search Plans Based on User  ${bc2_user_token}  ${False}
    Length Should Be  ${resp}  0
    ${resp}  Search Plans Based on User  ${sc_admin_no_need_token}  ${True}
    Length Should Be  ${resp}  0
    ${resp}  Search Plans Based on User  ${bc1_user_token}  ${False}
    ${plan}  Create Dictionary
    FOR  ${itr}  IN  @{resp}
        ${plan_found_id}  Get From Dictionary  ${itr}  id
        IF  $plan_found_id == $plan_id
            ${plan}  Set To Dictionary  ${itr}
            Exit For Loop
        END
    END
    Verify Plan Detail  ${plan}  ${mv}  ${bv}  ${dv}  ${test_stuff}[price]  ${status}  ${test_stuff}[name]  ${check_in_time}  ${enter_check}
    ${resp}  Search Plans Based on User  ${sc_admin_token}  ${True}
    ${plan}  Create Dictionary
    FOR  ${itr}  IN  @{resp}
        ${plan_found_id}  Get From Dictionary  ${itr}  id
        IF  $plan_found_id == $plan_id
            ${plan}  Set To Dictionary  ${itr}
            Exit For Loop
        END
    END
    Verify Plan Detail  ${plan}  ${mv}  ${bv}  ${dv}  ${test_stuff}[price]  ${status}  ${test_stuff}[name]  ${check_in_time}  ${enter_check}

Search By Plate Or Id
    [Arguments]  ${token}  ${plate}  ${id_card}  ${expect_result}=${True}
    ${p_req}  Create Dictionary  plate=${plate}
    ${p_resp}  Req to Server  /global/search_valid_plan_by_plate_id  ${token}  ${p_req}
    ${i_req}  Create Dictionary  id_card=${id_card}
    ${i_resp}  Req to Server  /global/search_valid_plan_by_plate_id  ${token}  ${i_req}
    Should Be Equal    ${p_resp}[result]    ${i_resp}[result]
    Should Be Equal  ${p_resp}[result]  ${expect_result}

Prepare Plan For Check In
    [Arguments]  ${plan_time}
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]  plan_time=${plan_time}
    Confirm A Plan  ${plan}
    Manual Pay A Plan  ${plan}
    RETURN  ${plan}