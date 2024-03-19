*** Settings ***
Resource  ../rbac/rbac_curd.resource
Resource  ../database.resource

*** Variables ***
&{sale_company}
&{no_need_sale_company}
&{buy_company1}
&{buy_company2}
${sc_admin_token}
${sc_admin_no_need_token}
${bc1_user_token}
${bc2_user_token}
${test_stuff}
*** Keywords ***
Prepare Companies And Users
    ${buy_company1}  Create One Company  bc1
    ${buy_company2}  Create One Company  bc2
    ${sale_company}  Create One Company  sc
    Company Set Script  ${sale_company}[id]  normal
    ${sc_admin_token}  Login As Admin Of Company  ${sale_company}[id]  1234  sc_admin
    Add Module To Company  ${sale_company}[id]  stuff
    Add Module To Company  ${sale_company}[id]  plan
    Add Module To Company  ${sale_company}[id]  cash
    Add Module To Company  ${sale_company}[id]  scale
    Add Module To Company  ${sale_company}[id]  sc
    Add Module To User  ${sc_admin_token}  1234  stuff
    Add Module To User  ${sc_admin_token}  1234  plan
    Add Module To User  ${sc_admin_token}  1234  cash
    Add Module To User  ${sc_admin_token}  1234  scale
    Add Module To User  ${sc_admin_token}  1234  sc
    ${no_need_sale_company}  Create One Company  sc_no_need
    Company Set Script  ${no_need_sale_company}[id]  normal
    ${sc_admin_no_need_token}  Login As Admin Of Company  ${no_need_sale_company}[id]  12341  sc_admin_no_need
    Add Module To Company  ${no_need_sale_company}[id]  stuff
    Add Module To Company  ${no_need_sale_company}[id]  plan
    Add Module To Company  ${no_need_sale_company}[id]  cash
    Add Module To Company  ${no_need_sale_company}[id]  scale
    Add Module To User  ${sc_admin_no_need_token}  12341  stuff
    Add Module To User  ${sc_admin_no_need_token}  12341  plan
    Add Module To User  ${sc_admin_no_need_token}  12341  cash
    Add Module To User  ${sc_admin_no_need_token}  12341  scale
    ${bc1_user_token}  New User Login  5678  ${buy_company1}[name]  2233  bu1
    ${bc2_user_token}  New User Login  9987  ${buy_company2}[name]  1123  bu2
    Set Suite Variable  ${buy_company1}
    Set Suite Variable  ${buy_company2}
    Set Suite Variable  ${no_need_sale_company}
    Set Suite Variable  ${sale_company}
    Set Suite Variable  ${sc_admin_token}
    Set Suite Variable  ${sc_admin_no_need_token}
    Set Suite Variable  ${bc1_user_token}
    Set Suite Variable  ${bc2_user_token}

Clean Up Companies And Users
    RBAC reset
    Company Reset

Add A Stuff To Sale
    [Arguments]  ${stuff_name}  ${stuff_comment}  ${expect_count}=${22}  ${token}=${sc_admin_token}
    ${req}  Create Dictionary  name=${stuff_name}  comment=${stuff_comment}  expect_count=${expect_count}
    ${resp}  Req to Server  /stuff/fetch  ${token}  ${req}
    RETURN  ${resp}
Change Stuff Price
    [Arguments]  ${stuff_id}  ${new_price}  ${to_plan}=${False}  ${comment}=test_change  ${token}=${sc_admin_token}
    ${req}  Create Dictionary  stuff_id=${stuff_id}  price=${new_price}  to_plan=${to_plan}  comment=${comment}
    Req to Server  /stuff/change_price  ${token}  ${req}

Del A Stuff From Sale
    [Arguments]  ${stuff_id}
    ${req}  Create Dictionary  id=${stuff_id}
    Req to Server  /stuff/del  ${sc_admin_token}  ${req}

Add A Company As Customer
    [Arguments]  ${company_id}  ${token}=${sc_admin_token}
    ${req}  Create Dictionary  customer_id=${company_id}
    Req to Server  /contract/make  ${token}  ${req}

Del A Customer Contract
    [Arguments]  ${contract_id}
    ${req}  Create Dictionary  contract_id=${contract_id}
    Req to Server  /contract/destroy  ${sc_admin_token}  ${req}

Add A Stuff To Contract
    [Arguments]  ${stuff_name}  ${customer_name}  ${token}=${sc_admin_token}
    ${target_contract}  Set Variable
    ${target_stuff}  Set Variable
    ${found_contracts}  Req Get to Server  /contract/get_all_sale  ${token}  contracts
    @{stuffs_found}  Req Get to Server  /stuff/get_all  ${token}  stuff
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
    Req to Server  /contract/add_stuff  ${token}  ${req}

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

Charge To A Company
    [Arguments]  ${company_id}  ${cash}  ${comment}=test_charge
    ${found_contracts}  Req Get to Server  /contract/get_all_sale  ${sc_admin_token}  contracts
    ${contract_id}  Set Variable
    FOR  ${itr}  IN  @{found_contracts}
        ${target_company_id}  Get From Dictionary  ${itr}[buy_company]  id
        IF  $target_company_id == $company_id
            ${contract_id}  Set Variable  ${itr}[id]
            Exit For Loop
        END
    END
    ${req}  Create Dictionary  contract_id=${contract_id}   cash_increased=${cash}  comment=${comment}
    Req to Server  /contract/charge  ${sc_admin_token}  ${req}
    RETURN  ${contract_id}

Get Cash Of A Company
    [Arguments]  ${company_name}
    ${found_contracts}  Req Get to Server  /contract/get_all_sale  ${sc_admin_token}  contracts
    ${ret}  Set Variable  ${0}
    FOR  ${itr}  IN  @{found_contracts}
        ${cust_name}  Get From Dictionary  ${itr}[buy_company]  name
        IF  $cust_name == $company_name
            ${ret}  Set Variable  ${itr}[balance]
            Exit For Loop
        END
    END
    RETURN  ${ret}

Prepare Sale and Buy
    Prepare Companies And Users
    Add A Stuff To Sale  lng  lng_comment
    Add A Company As Customer  ${buy_company1}[id]
    Add A Stuff To Contract  lng  bc1
    @{stuffs_found}  Req Get to Server  /stuff/get_stuff_on_sale  ${bc1_user_token}  stuff
    Set Suite Variable  ${test_stuff}  ${stuffs_found}[0]
    Change Stuff Price  ${test_stuff}[id]  ${1212}
    @{stuffs_found}  Req Get to Server  /stuff/get_stuff_on_sale  ${bc1_user_token}  stuff
    Set Suite Variable  ${test_stuff}  ${stuffs_found}[0]
    Authorize User to Contract  bc1  5678

Authorize User to Contract
    [Arguments]  ${company_name}  ${user_phone}  ${token}=${sc_admin_token}
    ${found_contracts}  Req Get to Server  /contract/get_all_sale  ${token}  contracts
    FOR  ${itr}  IN  @{found_contracts}
        ${buyer_name}  Get From Dictionary  ${itr}[buy_company]  name
        IF  $buyer_name == $company_name
            ${req}  Create Dictionary  contract_id=${itr}[id]  phone=${user_phone}
            Req to Server  /contract/authorize  ${token}  ${req}
            Exit For Loop
        END
    END

Unauthorize User to Contract
    [Arguments]  ${company_name}  ${user_phone}
    ${found_contracts}  Req Get to Server  /contract/get_all_sale  ${sc_admin_token}  contracts
    FOR  ${itr}  IN  @{found_contracts}
        ${buyer_name}  Get From Dictionary  ${itr}[buy_company]  name
        IF  $buyer_name == $company_name
            ${req}  Create Dictionary  contract_id=${itr}[id]  phone=${user_phone}
            Req to Server  /contract/unauthorize  ${sc_admin_token}  ${req}
            Exit For Loop
        END
    END
    Req to Server  /contract/unauthorize  ${sc_admin_token}  ${req}

Re-Add Stuff
    Add A Stuff To Sale  lng  lng_comment
    Add A Stuff To Contract  lng  bc1
    @{stuffs_found}  Req Get to Server  /stuff/get_stuff_on_sale  ${bc1_user_token}  stuff
    Set Suite Variable  ${test_stuff}  ${stuffs_found}[0]
    Change Stuff Price  ${test_stuff}[id]  ${1212}
    @{stuffs_found}  Req Get to Server  /stuff/get_stuff_on_sale  ${bc1_user_token}  stuff
    Set Suite Variable  ${test_stuff}  ${stuffs_found}[0]

Clean Up Sale and Buy
    Stuff Reset
    Contract Reset
    Clean Up Companies And Users

Create A Plan
    [Arguments]  ${bv_id}  ${mv_id}  ${dv_id}  ${token}=${bc1_user_token}  ${plan_time}=2024-09-01 13:00:00  ${comment}=测试备注  ${drop_address}=测试地点  ${use_for}=测试用途  ${stuff_id}=${test_stuff}[id]
    ${req}  Create Dictionary
    ...    behind_vehicle_id=${bv_id}
    ...    main_vehicle_id=${mv_id}
    ...    driver_id=${dv_id}
    ...    comment=${comment}
    ...    drop_address=${drop_address}
    ...    plan_time=${plan_time}
    ...    stuff_id=${stuff_id}
    ...    use_for=${use_for}
    ${resp}  Req to Server  /plan/create_single_plan  ${token}  ${req}
    RETURN  ${resp}

Confirm A Plan
    [Arguments]  ${plan}  ${token}=${sc_admin_token}
    ${req}  Create Dictionary  plan_id=${plan}[id]
    Req to Server  /plan/confirm_single_plan  ${token}  ${req}
Manual Pay A Plan
    [Arguments]  ${plan}  ${token}=${sc_admin_token}
    ${req}  Create Dictionary  plan_id=${plan}[id]
    Req to Server  /plan/pay  ${token}  ${req}
Plan Enter
    [Arguments]  ${plan}
    ${req}  Create Dictionary  plan_id=${plan}[id]
    Req to Server  /plan/enter  ${sc_admin_token}  ${req}
Driver Online
    [Arguments]  ${phone}  ${open_id}  ${id_card}
    ${req}  Create Dictionary  phone=${phone}  open_id=${open_id}  id_card=${id_card}
    Req to Server  /driver/update  none  ${req}
    ${req}  Create Dictionary   open_id=${open_id}
    ${resp}  Req to Server  /driver/online  none  ${req}
    RETURN  ${resp}
Check In A Plan
    [Arguments]  ${plan}  ${expect_fail}=${False}  ${index}=0
    ${driver}  Driver Online  ${plan}[driver][phone]  open_id_for_test  11100090909
    ${req}  Create Dictionary  open_id=${driver}[open_id]
    ${resp}  Req Get to Server  /driver/self_plan  none  plans  -1  &{req}
    ${req}  Create Dictionary  open_id=${driver}[open_id]  plan_id=${resp[${index}]}[id]
    Req to Server  /plan/check_in  none  ${req}  ${expect_fail}
Deliver A Plan
    [Arguments]  ${plan}  ${count}
    ${req}  Create Dictionary  plan_id=${plan}[id]  p_weight=${10}  m_weight=${30}  count=${count}  p_time=2018-01-01  m_time=2018-01-01
    Req to Server  /plan/deliver  ${sc_admin_token}  ${req}
Rollback Plan
    [Arguments]  ${plan}
    ${req}  Create Dictionary  plan_id=${plan}[id]
    Req to Server  /plan/rollback  ${sc_admin_token}  ${req}
Cancel Check In Plan
    [Arguments]  ${plan}
    ${req}  Create Dictionary  plan_id=${plan}[id]
    Req to Server  /plan/cancel_check_in  ${sc_admin_token}  ${req}
Search Driver by Index
    [Arguments]  ${itr}  ${token}=${bc1_user_token}
    ${req}  Create Dictionary  name=dn_${itr}  id_card=di_${itr}  phone=dp_${itr}
    ${resp}  Req to Server  /driver/fetch  ${token}  ${req}
    RETURN  ${resp}
Search Main Vehicle by Index
    [Arguments]  ${itr}  ${token}=${bc1_user_token}
    ${req}  Create Dictionary  plate=mv_${itr}
    ${resp}  Req to Server  /vehicle/fetch  ${token}  ${req}
    RETURN  ${resp}
Search behind Vehicle by Index
    [Arguments]  ${itr}  ${token}=${bc1_user_token}
    ${req}  Create Dictionary  plate=bv_${itr}
    ${resp}  Req to Server  /vehicle/fetch  ${token}  ${req}
    RETURN  ${resp}
Search Plans Based on User
    [Arguments]  ${token}  ${is_sale}=${True}  ${status}=${null}
    ${req}  Create Dictionary  start_time=2018-01-01  end_time=2090-09-09  status=${status}
    ${url}  Set Variable  /plan/get_sold_plans
    IF  $is_sale == False
        ${url}  Set Variable  /plan/get_bought_plans
    END
    ${resp}  Req Get to Server  ${url}  ${token}  plans  ${-1}  &{req}
    RETURN  ${resp}
Get Plan By Id
    [Arguments]  ${plan_id}
    ${resp}  Search Plans Based on User  ${bc1_user_token}  ${False}
    ${plan}  Create Dictionary
    FOR  ${itr}  IN  @{resp}
        ${plan_found_id}  Get From Dictionary  ${itr}  id
        IF  $plan_found_id == $plan_id
            ${plan}  Set To Dictionary  ${itr}
            Exit For Loop
        END
    END
    RETURN  ${plan}
Get Latest History Node
    [Arguments]  ${plan}
    ${history}  Copy List  ${plan}[plan_histories]
    Reverse List  ${history}
    RETURN  ${history}[0]

Update A Plan
    [Arguments]  ${plan_id}  &{update_info}
    Set To Dictionary  ${update_info}  plan_id=${plan_id}
    Req to Server  /plan/update  ${bc1_user_token}  ${update_info}

Cancel A Plan
    [Arguments]  ${plan}
    ${req}  Create Dictionary  plan_id=${plan}[id]
    Req to Server  /plan/cancel  ${bc1_user_token}  ${req}

Close A Plan
    [Arguments]  ${plan}
    ${req}  Create Dictionary  plan_id=${plan}[id]
    Req to Server  /plan/close  ${sc_admin_token}  ${req}