*** Settings ***
Resource  stuff_opt.resource
Suite Setup  Prepare Sale and Buy
Suite Teardown  Clean Up Sale and Buy

*** Variables ***
${nr_stuff}  ${EMPTY}

*** Test Cases ***
Check Discount When Higher Gate Arrive
    [Setup]  Prepare Several Plan
    [Teardown]  Run Keywords  Clean Subsidy  AND  Plan Reset
    Config Subsidy    ${20}    ${9}  
    Config Subsidy    ${100}    ${8}  
    ${orig_balance}  Get Cash Of A Company  ${buy_company1}[name]
    ${order_count}  Do Subsidy
    Should Be Equal As Integers    ${order_count}    10
    ${order_count}  Do Subsidy
    Should Be Equal As Integers    ${order_count}    0
    ${cur_balance}  Get Cash Of A Company  ${buy_company1}[name]
    ${real_addtion}  Evaluate    $cur_balance - $orig_balance
    Should Be Equal As Numbers    ${real_addtion}    202
    ${resp}  Search Plans Based on User  ${sc_admin_token}
    Length Should Be    ${resp}    16
    Should Be Equal As Numbers    ${resp}[0][subsidy_price]  0
    Should Be Equal As Numbers    ${resp}[5][subsidy_price]  8
    Should Be Equal As Numbers    ${resp}[9][subsidy_price]  8
    Should Be Equal As Numbers    ${resp}[14][subsidy_price]  8
    Should Be Equal As Numbers    ${resp}[15][subsidy_price]  0

Check Discount When Lower Gate Arrive
    [Setup]  Prepare Several Plan
    [Teardown]  Run Keywords  Clean Subsidy  AND  Plan Reset
    Config Subsidy    ${50.3}    ${9}  ${nr_stuff}[id]
    Config Subsidy    ${50.6}    ${8}  ${nr_stuff}[id]
    ${orig_balance}  Get Cash Of A Company  ${buy_company1}[name]
    ${order_count}  Do Subsidy
    Should Be Equal As Integers    ${order_count}    5
    ${cur_balance}  Get Cash Of A Company  ${buy_company1}[name]
    ${real_addtion}  Evaluate    $cur_balance - $orig_balance
    Should Be Equal As Numbers    ${real_addtion}    50.5
    ${resp}  Search Plans Based on User  ${sc_admin_token}
    Length Should Be    ${resp}    16
    Should Be Equal As Numbers    ${resp}[0][subsidy_price]  9
    Should Be Equal As Numbers    ${resp}[4][subsidy_price]  9
    Should Be Equal As Numbers    ${resp}[14][subsidy_price]  0
    Should Be Equal As Numbers    ${resp}[15][subsidy_price]  0

Check Discount When No Gate Arrive
    [Setup]  Prepare Several Plan
    [Teardown]  Run Keywords  Clean Subsidy  AND  Plan Reset
    Config Subsidy    ${50.6}    ${8}  ${nr_stuff}[id]
    Config Subsidy    ${102}    ${8}
    ${orig_balance}  Get Cash Of A Company  ${buy_company1}[name]
    ${order_count}  Do Subsidy
    Should Be Equal As Integers    ${order_count}    0
    ${cur_balance}  Get Cash Of A Company  ${buy_company1}[name]
    ${real_addtion}  Evaluate    $cur_balance - $orig_balance
    Should Be Equal As Numbers    ${real_addtion}    0
    ${resp}  Search Plans Based on User  ${sc_admin_token}
    Length Should Be    ${resp}    16
    Should Be Equal As Numbers    ${resp}[0][subsidy_price]  0
    Should Be Equal As Numbers    ${resp}[10][subsidy_price]  0
    Should Be Equal As Numbers    ${resp}[11][subsidy_price]  0
    Should Be Equal As Numbers    ${resp}[15][subsidy_price]  0
*** Keywords ***
Do Subsidy
    ${cur_date}  Get Current Date  result_format=%Y-%m-%d
    ${req}  Create Dictionary  plan_time_start=${cur_date}  plan_time_end=${cur_date}
    Req to Server    /cash/do_subsidy    ${sc_admin_token}    ${req}
    ${retry}  Set Variable  ${5}
    ${ret}  Set Variable  ${0}
    WHILE    $retry > 0
        ${all_records}  Req Get to Server    /cash/get_subsidy_record    ${sc_admin_token}    records
        ${order_count}  Get From Dictionary    ${all_records}[0]    order_count    ${0}
        ${status}  Get From Dictionary    ${all_records}[0]    status    处理中
        IF    $status != '处理中'
            ${ret}  Set Variable  ${order_count}
            Should Be Equal As Strings    ${status}    已完成
            BREAK
        END
        ${retry}  Evaluate    ${retry} - 1
        Sleep  5s
    END
    RETURN  ${ret}
Finish One Plan
    [Arguments]  ${count}  ${plan_time}=today  ${stuff_id}=${test_stuff}[id]
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]  plan_time=${plan_time}  stuff_id=${stuff_id}
    Confirm A Plan  ${plan}
    Manual Pay A Plan  ${plan}
    Deliver A Plan  ${plan}  ${count}
Prepare Several Plan
    Change Stuff Price    ${test_stuff}[id]    ${10}
    FOR    ${counter}    IN RANGE    0    10    1
        Finish One Plan    ${10.1}
    END
    Finish One Plan    ${10.1}  2023-10-01
    ${nr_stuff}  Add A Stuff To Sale    nr_stuff    nr_stuff
    Change Stuff Price    ${nr_stuff}[id]    ${10}
    FOR    ${counter}    IN RANGE    0    5    1
        Finish One Plan    ${10.1}  stuff_id=${nr_stuff}[id]
    END
    Set Suite Variable  ${nr_stuff}  ${nr_stuff}

Config Subsidy
    [Arguments]  ${gate}  ${discount}    ${stuff_id}=${test_stuff}[id]  
    Add Subsidy    ${stuff_id}    ${gate}    ${discount}  
Clean Subsidy
    ${resp}  Get Subsidy
    FOR    ${single_sub}    IN    @{resp}
        Del Subsidy    ${single_sub}[id]
    END