*** Settings ***
Resource  stuff_opt.resource
Suite Setup  Prepare Sale and Buy
Suite Teardown  Clean Up Sale and Buy

*** Variables ***
@{all_plans}
${today_date}

*** Keywords ***
Change Price
    [Arguments]  ${new_price}
    Change Stuff Price    ${test_stuff}[id]    ${new_price}  ${True}
Set Balance
    [Arguments]  ${amount}
    ${resp}  Get Cash Of A Company    ${buy_company1}[name]
    ${should_add}  Evaluate    $amount - $resp
    Charge To A Company    ${buy_company1}[id]    ${should_add}
Create 5 Plans
    FOR  ${i}  IN RANGE  5
        ${mv}  Search Main Vehicle by Index  0
        ${bv}  Search behind Vehicle by Index  0
        ${dv}  Search Driver by Index  0
        ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
        Append To List  ${all_plans}  ${plan}
    END
    Log    ${all_plans}

Define Infrastructure
    Change Price    ${2}
    Set Balance    ${10}
    Add A Stuff To Sale    ${test_stuff}[name]    ${test_stuff}[comment]  ${3}
    Create 5 Plans
    ${tmp_date}  Get Current Date  result_format=%Y-%m-%d
    Set Suite Variable  ${today_date}  ${tmp_date}

Clean Plans
    Plan Reset
    @{empty_list}  Create List
    set Suite Variable  ${all_plans}  ${empty_list}

Make Balance Enough to Plans
    [Arguments]  @{plan_ids}
    ${total_price}  Set Variable  ${0}
    FOR  ${plan_id}  IN  @{plan_ids}
        ${plan}  Get Plan By Id    ${plan_id}
        ${unit_price}  Get From Dictionary  ${plan}  unit_price  ${0}
        ${single_cost}  Evaluate  ${unit_price} * 3
        ${total_price}  Evaluate  ${total_price} + ${single_cost}
    END
    Set Balance    ${total_price}

Calculate Lack of Balance
    ${req}  Create Dictionary  start_time=${today_date}  end_time=${today_date}  status=${2}
    ${resp}  Req Get to Server   /sale_management/order_search   ${sc_admin_token}  plans  ${-1}  &{req}
    ${pre_take}  Set Variable  ${0}
    FOR  ${plan}  IN  @{resp}
        ${cost}  Evaluate  ${plan}[unit_price] * 3
        ${pre_take}  Evaluate  ${pre_take} + ${cost}
    END
    ${req}  Create Dictionary  start_time=${today_date}  end_time=${today_date}  status=${1}
    ${resp}  Req Get to Server   /sale_management/order_search   ${sc_admin_token}  plans  ${-1}  &{req}
    ${total_lack}  Set Variable  ${0}
    FOR  ${plan}  IN  @{resp}
        ${cost}  Evaluate  ${plan}[unit_price] * 3
        ${total_lack}  Evaluate  ${total_lack} + ${cost}
    END
    ${cur_balance}  Get Cash Of A Company  ${buy_company1}[name]
    ${lack}  Evaluate  ${pre_take} + ${total_lack} - ${cur_balance}
    RETURN  ${lack}

Check All Plans
    [Arguments]  ${passed_count}
    Sleep    1600ms
    ${count}  Set Variable  ${0}
    ${lack}  Calculate Lack of Balance
    ${lack_from_plan}  Set Variable  ${0}
    ${extra_lack}  Set Variable  ${0}
    FOR  ${i}  IN RANGE  0  5
        ${plan}  Get Plan By Id    ${all_plans}[${i}][id]
        ${status}  Get From Dictionary  ${plan}  status  ${0}
        IF  $status == 1
            ${lack_from_plan}  Evaluate  ${lack_from_plan} + ${plan}[arrears]
            ${extra_lack}  Evaluate  ${plan}[arrears] - ${plan}[unit_price] * 3
            ${lack_from_plan}  Evaluate  ${lack_from_plan} - ${extra_lack}
        END
        IF  $status == 2
            ${count}  Evaluate  ${count} + 1
        END
    END
    ${lack_from_plan}  Evaluate  ${lack_from_plan} + ${extra_lack}
    Should Be Equal As Integers    ${count}    ${passed_count}
    Should Be Equal As Numbers    ${lack}    ${lack_from_plan}

Check One Plan
    [Arguments]  ${plan_id}  ${expect_pass}=${True}
    Sleep    1400ms
    ${plan}  Get Plan By Id    ${plan_id}
    ${status}  Get From Dictionary  ${plan}  status  ${0}
    IF  ${expect_pass}
        Should Be Equal As Numbers    ${status}    2
    ELSE
        Should Be Equal As Numbers    ${status}    1
    END

Change One Plan Price
    [Arguments]  ${plan_id}  ${new_price}
    ${plan_id_string}  Convert To String    ${plan_id}
    ${req}=    Create Dictionary    unit_price=${new_price}  plan_id=${plan_id_string}  comment=测试改价重新计算
    Req to Server  /stuff/change_price_by_plan  ${sc_admin_token}  ${req}

*** Test Cases ***
Confirm Plan And Deliver Plan
    [Setup]  Define Infrastructure
    [Teardown]  Clean Plans
    @{enough_plans}  Create List  ${all_plans}[2][id]  ${all_plans}[3][id]
    Make Balance Enough to Plans  @{enough_plans}
    Confirm A Plan    ${all_plans}[2]
    Confirm A Plan    ${all_plans}[3]
    Confirm A Plan    ${all_plans}[0]
    Confirm A Plan    ${all_plans}[1]
    Confirm A Plan    ${all_plans}[4]
    Check One Plan    ${all_plans}[2][id]
    Check One Plan    ${all_plans}[3][id]
    Check All Plans    ${2}
    Manual Pay A Plan    ${all_plans}[0]
    Check All Plans    ${3}
    Deliver A Plan    ${all_plans}[2]    ${1}
    Deliver A Plan    ${all_plans}[3]    ${1}
    Deliver A Plan    ${all_plans}[0]    ${1}
    Check All Plans    ${1}
Delete Plan And Check
    [Setup]  Define Infrastructure
    [Teardown]  Clean Plans
    @{enough_plans}  Create List  ${all_plans}[2][id]  ${all_plans}[3][id]
    Make Balance Enough to Plans  @{enough_plans}
    Confirm A Plan    ${all_plans}[2]
    Confirm A Plan    ${all_plans}[3]
    Confirm A Plan    ${all_plans}[0]
    Confirm A Plan    ${all_plans}[1]
    Close A Plan    ${all_plans}[2]
    Check All Plans    ${2}

Rollback And Check
    [Setup]  Define Infrastructure
    [Teardown]  Clean Plans
    @{enough_plans}  Create List  ${all_plans}[2][id]  ${all_plans}[3][id]
    Make Balance Enough to Plans  @{enough_plans}
    Confirm A Plan    ${all_plans}[2]
    Confirm A Plan    ${all_plans}[3]
    Confirm A Plan    ${all_plans}[1]
    Confirm A Plan    ${all_plans}[4]
    Rollback Plan    ${all_plans}[2]
    Check One Plan    ${all_plans}[1][id]
    Check All Plans    ${2}
    Deliver A Plan    ${all_plans}[3]    ${0}
    Check All Plans    ${2}
    Rollback Plan    ${all_plans}[3]
    Check All Plans    ${3}

Charge And Check
    [Setup]  Define Infrastructure
    [Teardown]  Clean Plans
    @{enough_plans}  Create List  ${all_plans}[2][id]  ${all_plans}[3][id]
    Make Balance Enough to Plans  @{enough_plans}
    Confirm A Plan    ${all_plans}[2]
    Confirm A Plan    ${all_plans}[3]
    Confirm A Plan    ${all_plans}[1]
    Confirm A Plan    ${all_plans}[4]
    Append To List    ${enough_plans}  ${all_plans}[1][id]
    Make Balance Enough to Plans  @{enough_plans}
    Check All Plans    ${3}

Change Price And Check
    [Setup]  Define Infrastructure
    [Teardown]  Clean Plans
    Change Price    ${5}
    @{enough_plans}  Create List  ${all_plans}[2][id]  ${all_plans}[3][id]
    Make Balance Enough to Plans  @{enough_plans}
    Confirm A Plan    ${all_plans}[2]
    Confirm A Plan    ${all_plans}[3]
    Confirm A Plan    ${all_plans}[1]
    Confirm A Plan    ${all_plans}[4]
    Confirm A Plan    ${all_plans}[0]
    Change Price    ${3}
    Check All Plans    ${3}
    Change One Plan Price    ${all_plans}[2][id]    ${1}
    Check All Plans    ${4}