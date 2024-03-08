*** Settings ***
Resource  stuff_opt.resource
Suite Setup  Prepare Sale and Buy
Suite Teardown  Clean Up Sale and Buy
*** Test Cases ***
Plan Create and Check
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Search And Verify Plan  ${mv}  ${bv}  ${dv}  ${plan}[id]  0
Plan Confirm with No Cash and Check
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Search And Verify Plan  ${mv}  ${bv}  ${dv}  ${plan}[id]  1
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
    Search And Verify Plan  ${mv}  ${bv}  ${dv}  ${plan}[id]  2  ${True}

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
    Deliver A Plan  ${plan}  ${23}
    Search And Verify Plan  ${mv}  ${bv}  ${dv}  ${plan}[id]  3  ${True}
    ${cur_balance}  Get Cash Of A Company  ${buy_company1}[name]
    ${single_cost}  Set Variable  ${plan}[unit_price]
    ${single_cost}  Set Variable  ${single_cost * 23}
    ${expect_balance}  Evaluate  $orig_balance - $single_cost
    Should Be Equal  ${expect_balance}  ${cur_balance}

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

    ${req}  Create Dictionary  start_time=2018-01-01  end_time=2090-09-09  status=${0}
    ${resp}  Req Get to Server  /plan/get_bought_plans  ${bc1_user_token}  plans  ${-1}  &{req}
    Length Should Be  ${resp}  ${only_create_count}
    ${resp}  Req Get to Server  /plan/get_sold_plans  ${sc_admin_token}  plans  ${-1}  &{req}
    Length Should Be  ${resp}  ${only_create_count}

    ${req}  Create Dictionary  start_time=2018-01-01  end_time=2090-09-09  status=${1}
    ${resp}  Req Get to Server  /plan/get_bought_plans  ${bc1_user_token}  plans  ${-1}  &{req}
    Length Should Be  ${resp}  ${only_confirm_count}
    ${resp}  Req Get to Server  /plan/get_sold_plans  ${sc_admin_token}  plans  ${-1}  &{req}
    Length Should Be  ${resp}  ${only_confirm_count}

    ${req}  Create Dictionary  start_time=2018-01-01  end_time=2090-09-09  status=${2}
    ${resp}  Req Get to Server  /plan/get_bought_plans  ${bc1_user_token}  plans  ${-1}  &{req}
    Length Should Be  ${resp}  ${only_pay_count}
    ${resp}  Req Get to Server  /plan/get_sold_plans  ${sc_admin_token}  plans  ${-1}  &{req}
    Length Should Be  ${resp}  ${only_pay_count}

    ${req}  Create Dictionary  start_time=2018-01-01  end_time=2090-09-09  status=${3}
    ${resp}  Req Get to Server  /plan/get_bought_plans  ${bc1_user_token}  plans  ${-1}  &{req}
    Length Should Be  ${resp}  ${after_deliver_count}
    ${resp}  Req Get to Server  /plan/get_sold_plans  ${sc_admin_token}  plans  ${-1}  &{req}
    Length Should Be  ${resp}  ${after_deliver_count}


*** Keywords ***
Verify Plan Detail
    [Arguments]  ${plan}  ${mv}  ${bv}  ${dv}  ${price}  ${status}  ${check_in_time}=${False}
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
    END

Search And Verify Plan
    [Arguments]  ${mv}  ${bv}  ${dv}  ${plan_id}  ${status}  ${check_in_time}=${False}
    ${req}  Create Dictionary  start_time=2018-01-01  end_time=2090-09-09
    ${resp}  Req Get to Server  /plan/get_bought_plans  ${bc2_user_token}  plans  ${-1}  &{req}
    Length Should Be  ${resp}  0
    ${resp}  Req Get to Server  /plan/get_sold_plans  ${sc_admin_no_need_token}  plans  ${-1}  &{req}
    Length Should Be  ${resp}  0

    ${req}  Create Dictionary  start_time=2018-01-01  end_time=2090-09-09
    ${resp}  Req Get to Server  /plan/get_bought_plans  ${bc1_user_token}  plans  ${-1}  &{req}
    ${plan}  Create Dictionary
    FOR  ${itr}  IN  @{resp}
        ${plan_found_id}  Get From Dictionary  ${itr}  id
        IF  $plan_found_id == $plan_id
            ${plan}  Set To Dictionary  ${itr}
            Exit For Loop
        END
    END
    Verify Plan Detail  ${plan}  ${mv}  ${bv}  ${dv}  ${test_stuff}[price]  ${status}  ${check_in_time}
    ${req}  Create Dictionary  start_time=2018-01-01  end_time=2090-09-09
    ${resp}  Req Get to Server  /plan/get_sold_plans  ${sc_admin_token}  plans  ${-1}  &{req}
    ${plan}  Create Dictionary
    FOR  ${itr}  IN  @{resp}
        ${plan_found_id}  Get From Dictionary  ${itr}  id
        IF  $plan_found_id == $plan_id
            ${plan}  Set To Dictionary  ${itr}
            Exit For Loop
        END
    END
    Verify Plan Detail  ${plan}  ${mv}  ${bv}  ${dv}  ${test_stuff}[price]  ${status}  ${check_in_time}
Search Driver by Index
    [Arguments]  ${itr}
    ${req}  Create Dictionary  name=dn_${itr}  id_card=di_${itr}  phone=dp_${itr}
    ${resp}  Req to Server  /driver/fetch  ${bc1_user_token}  ${req}
    RETURN  ${resp}
Search Main Vehicle by Index
    [Arguments]  ${itr}
    ${req}  Create Dictionary  plate=mv_${itr}
    ${resp}  Req to Server  /vehicle/fetch  ${bc1_user_token}  ${req}
    RETURN  ${resp}
Search behind Vehicle by Index
    [Arguments]  ${itr}
    ${req}  Create Dictionary  plate=bv_${itr}
    ${resp}  Req to Server  /vehicle/fetch  ${bc1_user_token}  ${req}
    RETURN  ${resp}


