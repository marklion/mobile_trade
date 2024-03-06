*** Settings ***
Resource  ../rbac/rbac_curd.resource
Resource  ../database.resource

*** Variables ***
&{sale_company}
&{buy_company1}
&{buy_company2}
${sc_admin_token}
${bc1_user_token}
${bc2_user_token}
${test_stuff}
*** Keywords ***
Prepare Companies And Users
    ${buy_company1}  Create One Company  bc1
    ${buy_company2}  Create One Company  bc2
    ${sale_company}  Create One Company  sc
    ${sc_admin_token}  Login As Admin Of Company  ${sale_company}[id]  1234
    Add Module To Company  ${sale_company}[id]  stuff
    Add Module To Company  ${sale_company}[id]  plan
    Add Module To User  ${sc_admin_token}  1234  stuff
    Add Module To User  ${sc_admin_token}  1234  plan
    ${bc1_user_token}  New User Login  5678  ${buy_company1}[name]  2233  bu1
    ${bc2_user_token}  New User Login  9987  ${buy_company2}[name]  1123  bu2
    Set Suite Variable  ${buy_company1}
    Set Suite Variable  ${buy_company2}
    Set Suite Variable  ${sale_company}
    Set Suite Variable  ${sc_admin_token}
    Set Suite Variable  ${bc1_user_token}
    Set Suite Variable  ${bc2_user_token}

Clean Up Companies And Users
    RBAC reset
    Company Reset

Add A Stuff To Sale
    [Arguments]  ${stuff_name}  ${stuff_price}  ${stuff_comment}
    ${req}  Create Dictionary  name=${stuff_name}  price=${stuff_price}  comment=${stuff_comment}
    Req to Server  /stuff/fetch  ${sc_admin_token}  ${req}

Del A Stuff From Sale
    [Arguments]  ${stuff_id}
    ${req}  Create Dictionary  id=${stuff_id}
    Req to Server  /stuff/del  ${sc_admin_token}  ${req}

Add A Company As Customer
    [Arguments]  ${company_id}
    ${req}  Create Dictionary  customer_id=${company_id}
    Req to Server  /contract/make  ${sc_admin_token}  ${req}

Del A Customer Contract
    [Arguments]  ${contract_id}
    ${req}  Create Dictionary  contract_id=${contract_id}
    Req to Server  /contract/destroy  ${sc_admin_token}  ${req}

Add A Stuff To Contract
    [Arguments]  ${stuff_name}  ${customer_name}
    ${target_contract}  Set Variable
    ${target_stuff}  Set Variable
    ${found_contracts}  Req Get to Server  /contract/get_all_sale  ${sc_admin_token}  contracts
    @{stuffs_found}  Req Get to Server  /stuff/get_all  ${sc_admin_token}  stuff
    FOR  ${itr}  IN  @{found_contracts}
        ${buyer_name}  Get From Dictionary  ${itr}[buy_company]  name
        IF  $buyer_name == $customer_name
            ${target_contract}  Set Variable  ${itr}
            Exit For Loop
        END
    END
    FOR  ${itr}  IN  @{stuffs_found}
        ${stuff_name}  Get From Dictionary  ${itr}  name
        IF  $stuff_name == $stuff_name
            ${target_stuff}  Set Variable  ${itr}
            Exit For Loop
        END
    END
    ${req}  Create Dictionary  stuff_id=${target_stuff}[id]  contract_id=${target_contract}[id]
    Req to Server  /contract/add_stuff  ${sc_admin_token}  ${req}

Del A Stuff From Contract
    [Arguments]  ${stuff_name}  ${customer_name}
    ${target_contract}  Set Variable
    ${target_stuff}  Set Variable
    ${found_contracts}  Req Get to Server  /contract/get_all_sale  ${sc_admin_token}  contracts
    @{stuffs_found}  Req Get to Server  /stuff/get_all  ${sc_admin_token}  stuff
    FOR  ${itr}  IN  @{found_contracts}
        ${buyer_name}  Get From Dictionary  ${itr}[buy_company]  name
        IF  $buyer_name == $customer_name
            ${target_contract}  Set Variable  ${itr}
            Exit For Loop
        END
    END
    FOR  ${itr}  IN  @{stuffs_found}
        ${stuff_name}  Get From Dictionary  ${itr}  name
        IF  $stuff_name == $stuff_name
            ${target_stuff}  Set Variable  ${itr}
            Exit For Loop
        END
    END
    ${req}  Create Dictionary  stuff_id=${target_stuff}[id]  contract_id=${target_contract}[id]
    Req to Server  /contract/del_stuff  ${sc_admin_token}  ${req}

Prepare Sale and Buy
    Prepare Companies And Users
    Add A Stuff To Sale  lng  ${1211}  lng_comment
    Add A Company As Customer  ${buy_company1}[id]
    Add A Stuff To Contract  lng  bc1
    @{stuffs_found}  Req Get to Server  /stuff/get_stuff_on_sale  ${bc1_user_token}  stuff
    Set Suite Variable  ${test_stuff}  ${stuffs_found}[0]

Clean Up Sale and Buy
    Stuff Reset
    Contract Reset
    Clean Up Companies And Users

Create A Plan
    [Arguments]  ${bv_id}  ${mv_id}  ${dv_id}  ${plan_time}=2024-09-01 13:00:00  ${comment}=测试备注  ${drop_address}=测试地点  ${use_for}=测试用途
    ${req}  Create Dictionary
    ...    behind_vehicle_id=${bv_id}
    ...    main_vehicle_id=${mv_id}
    ...    driver_id=${dv_id}
    ...    comment=${comment}
    ...    drop_address=${drop_address}
    ...    plan_time=${plan_time}
    ...    stuff_id=${test_stuff}[id]
    ...    use_for=${use_for}
    ${resp}  Req to Server  /plan/create_single_plan  ${bc1_user_token}  ${req}