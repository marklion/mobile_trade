*** Settings ***
Resource  stuff_opt.resource
Suite Setup  Prepare Sale and Buy
Suite Teardown  Clean Up Sale and Buy

*** Variables ***
@{main_vehicle_plates}  藏A11223  新A44321  京D221K1
@{behind_vehicle_plates}  黑A9980挂  京A1245挂  藏A1123挂
@{driver_ids}  110101198001010011  110101198001010012  110101198001010013
@{driver_names}  张三  李四  王五
@{driver_phones}  13800138000  13800138001  13800138002

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

*** Keywords ***
Verify Plan Detail
    [Arguments]  ${plan}  ${mv}  ${bv}  ${dv}  ${price}  ${status}
    Should Be Equal As Strings  ${plan}[behind_vehicle][plate]  ${bv}[plate]
    Should Be Equal As Strings  ${plan}[main_vehicle][plate]  ${mv}[plate]
    Should Be Equal As Strings  ${plan}[driver][id_card]  ${dv}[id_card]
    Should Be Equal As Numbers  ${plan}[unit_price]  ${price}
    Should Be Equal As Integers  ${plan}[status]  ${status}
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

Search And Verify Plan
    [Arguments]  ${mv}  ${bv}  ${dv}  ${plan_id}  ${status}
    ${req}  Create Dictionary  start_time=2018-01-01  end_time=2090-09-09
    ${resp}  Req Get to Server  /plan/get_bought_plans  ${bc2_user_token}  plans  ${-1}  &{req}
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
    Verify Plan Detail  ${plan}  ${mv}  ${bv}  ${dv}  ${test_stuff}[price]  ${status}
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
    Verify Plan Detail  ${plan}  ${mv}  ${bv}  ${dv}  ${test_stuff}[price]  ${status}




Fetch Driver and Vehicles
    FOR  ${itr}  IN RANGE  3
        Search Driver by Index  ${itr}
        Search Main Vehicle by Index  ${itr}
        Search behind Vehicle by Index  ${itr}
    END
Search Driver by Index
    [Arguments]  ${itr}
    ${req}  Create Dictionary  name=${driver_names[${itr}]}  id_card=${driver_ids[${itr}]}  phone=${driver_phones[${itr}]}
    ${resp}  Req to Server  /driver/fetch  ${bc1_user_token}  ${req}
    RETURN  ${resp}
Search Main Vehicle by Index
    [Arguments]  ${itr}
    ${req}  Create Dictionary  plate=${main_vehicle_plates[${itr}]}
    ${resp}  Req to Server  /vehicle/fetch  ${bc1_user_token}  ${req}
    RETURN  ${resp}
Search behind Vehicle by Index
    [Arguments]  ${itr}
    ${req}  Create Dictionary  plate=${behind_vehicle_plates[${itr}]}
    ${resp}  Req to Server  /vehicle/fetch  ${bc1_user_token}  ${req}
    RETURN  ${resp}


