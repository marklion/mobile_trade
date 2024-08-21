*** Settings ***
Resource    ../stuff/stuff_opt.resource
Resource    ../database.resource
Library     DateTime
Suite Setup    Create Test Data
Suite Teardown  Clean Up Sale and Buy
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

*** Test Cases ***
Change Price With Muti Plan
    [Teardown]  Contract Reset
    [Documentation]    测试更改计划价格（批量）
    ${plan_ids}=    Get Variable Value    ${TEST_PLAN_IDS}
    ${plan_ids_str}=    Evaluate    ",".join(map(str, $plan_ids))
    ${req}=    Create Dictionary    unit_price=${NEW_PRICE}  plan_id=${plan_ids_str}    comment=${COMMENT}
    ${resp}=    Req to Server    /stuff/change_price_by_plan    ${sc_admin_token}    ${req}
    Should Be Equal As Strings    ${resp}[result]    True
    Verify Plan Prices Updated    ${plan_ids}    ${NEW_PRICE}

Change Price With Single Plan
    [Teardown]  Contract Reset
    [Documentation]    测试更改计划价格（单个）
    ${req}=    Create Dictionary    unit_price=${NEW_PRICE}   plan_id=1   comment=${COMMENT}
    ${resp}=   Req to Server    /stuff/change_price_by_plan    ${sc_admin_token}    ${req} 
    Should Be Equal As Strings    ${resp}[result]    True

Change Price With Non-Existent Plan
    [Teardown]  Contract Reset
    [Documentation]    测试使用不存在的计划ID
    ${req}=    Create Dictionary    unit_price=${NEW_PRICE}    plan_id=9999    comment=${COMMENT}
    ${resp}=   Req to Server    /stuff/change_price_by_plan    ${sc_admin_token}    ${req}
    Should Be Equal As Strings    ${resp}[result]    True

# Change Price Without Permission
#     [Teardown]  Contract Reset
#     [Documentation]    测试无权限用户更改价格
#     ${req}=    Create Dictionary    unit_price=${NEW_PRICE}    plan_id=1    comment=${COMMENT}
#     ${resp}=   Req to Server    /stuff/change_price_by_plan    ${bc1_user_token}    ${req}
#     Should Be Equal As Strings    ${resp}[result]    False


