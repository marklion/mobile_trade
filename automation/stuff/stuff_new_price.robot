*** Settings ***
Resource    ../stuff/stuff_opt.resource
Resource    ../database.resource
Library     DateTime
Suite Setup    Create Test Data
Suite Teardown  Run Keywords  Clean Up Sale and Buy  AND  Plan Reset
*** Variables ***
${NEW_PRICE}   ${66.88}
${COMMENT}    测试备注
@{TEST_PLANS}
...    {"plan_time": "2024-08-20 10:00:00", "unit_price": 50.00, "status": 3, "count": 100.0, "use_for": "测试用途1"}
...    {"plan_time": "2024-08-21 11:00:00", "unit_price": 55.00, "status": 3, "count": 150.0, "use_for": "测试用途2"}
...    {"plan_time": "2024-08-22 12:00:00", "unit_price": 60.00, "status": 3, "count": 200.0, "use_for": "测试用途3"}

*** Keywords ***
Create Test Data
    #销售/采购流程
    Prepare Sale and Buy
    @{plan_ids}=    Create List
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    FOR    ${plan}    IN    @{TEST_PLANS}
        ${created_plan}=    Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
        Append To List    ${plan_ids}    ${created_plan}[id]
    END
    Set Suite Variable    ${TEST_PLAN_IDS}    ${plan_ids}

Verify Plan Prices Updated
    [Arguments]    ${plan_ids}    ${expected_price}
    FOR    ${plan_id}    IN    @{plan_ids}
        ${plan}=    Get Plan By Id    ${plan_id}
        Should Be Equal As Numbers    ${plan}[unit_price]    ${expected_price}
    END

Do Change Price By Plan
    [Arguments]  ${plan_ids}    ${expected_price}  ${token}=${sc_admin_token}  ${expect_failure}=${False}
    ${plan_ids_str}=    Evaluate    ",".join(map(str, $plan_ids))
    ${req}=    Create Dictionary    unit_price=${expected_price}  plan_id=${plan_ids_str}  comment=${COMMENT}
    ${resp}=    Req to Server    /stuff/change_price_by_plan    ${sc_admin_token}  ${req}  ${expect_failure}

Change And Verify Price
    [Arguments]  ${plan_id}  ${token}=${sc_admin_token}  ${expected_price}=${1245}
    ${plan_id_string}  Convert To String    ${plan_id}
    @{plan_ids}  Create List    ${plan_id_string}
    Do Change Price By Plan    ${plan_ids}    ${expected_price}
    Sleep    1s
    ${plan}  Get Plan By Id    ${plan_id}
    Should Be Equal As Numbers    ${plan}[unit_price]    ${expected_price}

*** Test Cases ***
Change Price With Muti Plan
    [Documentation]    测试更改计划价格（批量）
    ${plan_ids}=    Get Variable Value    ${TEST_PLAN_IDS}
    Do Change Price By Plan    ${plan_ids}    ${NEW_PRICE}
    Verify Plan Prices Updated    ${plan_ids}    ${NEW_PRICE}

Change Price With Single Plan
    [Documentation]    测试更改计划价格（单个）
    ${plan_ids}=    Get Variable Value    ${TEST_PLAN_IDS}
    ${plan_id}  Convert To String  ${plan_ids}[0]
    @{plan_ids}  Create List  ${plan_id}
    Do Change Price By Plan    ${plan_ids}    ${123}
    ${plan}=    Get Plan By Id    ${plan_ids}[0]
    Should Be Equal As Numbers    ${plan}[unit_price]    ${123}
    Confirm A Plan    ${plan}
    Manual Pay A Plan    ${plan}
    Change And Verify Price    ${plan}[id]  expected_price=${3131}
    Deliver A Plan  ${plan}  ${23}
    Do Change Price By Plan    ${plan_ids}    ${123}  expect_failure=${True}

Change Price of One Order
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Order  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Order  ${plan}
    Change And Verify Price    ${plan}[id]
    Deliver A Plan  ${plan}  ${23}
    Change And Verify Price    ${plan}[id]  expected_price=${5541}
