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
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    ${req}  Create Dictionary  start_time=2018-01-01  end_time=2026-09-09
    ${resp}  Req Get to Server  /plan/get_bought_plans  ${bc1_user_token}  plans  ${-1}  &{req}
    ${only_plan}  Set Variable  ${resp}[0]
    Verify Plan Detail  ${only_plan}  ${mv}  ${bv}  ${dv}  ${test_stuff}[price]  0  bu1
    ${resp}  Req Get to Server  /plan/get_sold_plans  ${sc_admin_token}  plans  ${-1}  &{req}
    ${only_plan}  Set Variable  ${resp}[0]
    Verify Plan Detail  ${only_plan}  ${mv}  ${bv}  ${dv}  ${test_stuff}[price]  0  bu1

*** Keywords ***
Verify Plan Detail
    [Arguments]  ${plan}  ${mv}  ${bv}  ${dv}  ${price}  ${status}  ${creator}=${None}  ${confirmer}=${None}
    Should Be Equal As Strings  ${plan}[behind_vehicle][plate]  ${bv}[plate]
    Should Be Equal As Strings  ${plan}[main_vehicle][plate]  ${mv}[plate]
    Should Be Equal As Strings  ${plan}[driver][id_card]  ${dv}[id_card]
    Should Be Equal As Numbers  ${plan}[unit_price]  ${price}
    Should Be Equal As Integers  ${plan}[status]  ${status}
    ${history}  Copy List  ${plan}[plan_histories]
    Reverse List  ${history}
    IF  $creator != $None
        FOR  ${itr}  IN  @{history}
            ${action}  Get From Dictionary  ${itr}  action_type
            IF  $action == '创建'
                Should Be Equal As Strings  ${itr}[operator]  ${creator}
            END
        END
    END
    IF  $confirmer != $None
        FOR  ${itr}  IN  @{history}
            ${action}  Get From Dictionary  ${itr}  action_type
            IF  $action == '确认'
                Should Be Equal As Strings  ${itr}[operator]  ${confirmer}
            END
        END
    END

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


