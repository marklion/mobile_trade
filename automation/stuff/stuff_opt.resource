*** Settings ***
Resource  ../rbac/rbac_curd.resource
Resource  ../database.resource
Library    ../.venv/lib/python3.9/site-packages/robot/libraries/DateTime.py

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
${order_stuff}
*** Keywords ***
Prepare Companies And Users
    ${buy_company1}  Create One Company  bc1
    ${buy_company2}  Create One Company  bc2
    ${sale_company}  Create One Company  sc
    Company Set Script  ${sale_company}[id]  normal
    ${sc_admin_token}  Login As Admin Of Company  ${sale_company}[id]  1234  sc_admin
    Add Module To Company  ${sale_company}[id]  stuff
    Add Module To Company  ${sale_company}[id]  cash
    Add Module To Company  ${sale_company}[id]  scale
    Add Module To Company  ${sale_company}[id]  sc
    Add Module To Company  ${sale_company}[id]  sale_management
    Add Module To Company  ${sale_company}[id]  buy_management
    Add Module To User  ${sc_admin_token}  1234  stuff
    Add Module To User  ${sc_admin_token}  1234  cash
    Add Module To User  ${sc_admin_token}  1234  scale
    Add Module To User  ${sc_admin_token}  1234  sc
    Add Module To User  ${sc_admin_token}  1234  sale_management
    Add Module To User  ${sc_admin_token}  1234  buy_management
    ${no_need_sale_company}  Create One Company  sc_no_need
    Company Set Script  ${no_need_sale_company}[id]  normal
    ${sc_admin_no_need_token}  Login As Admin Of Company  ${no_need_sale_company}[id]  12341  sc_admin_no_need
    Add Module To Company  ${no_need_sale_company}[id]  stuff
    Add Module To Company  ${no_need_sale_company}[id]  cash
    Add Module To Company  ${no_need_sale_company}[id]  scale
    Add Module To Company  ${no_need_sale_company}[id]  sale_management
    Add Module To Company  ${no_need_sale_company}[id]  buy_management
    Add Module To User  ${sc_admin_no_need_token}  12341  stuff
    Add Module To User  ${sc_admin_no_need_token}  12341  cash
    Add Module To User  ${sc_admin_no_need_token}  12341  scale
    Add Module To User  ${sc_admin_no_need_token}  12341  sale_management
    Add Module To User  ${sc_admin_no_need_token}  12341  buy_management
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

Add A Stuff To Buy
    [Arguments]  ${stuff_name}  ${stuff_comment}  ${expect_count}=${22}  ${token}=${sc_admin_token}
    ${req}  Create Dictionary  name=${stuff_name}  comment=${stuff_comment}  expect_count=${expect_count}  use_for_buy=${True}
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
    Req to Server  /sale_management/contract_make  ${token}  ${req}

Add A Company As Supplier
    [Arguments]  ${company_id}  ${token}=${sc_admin_token}
    ${req}  Create Dictionary  supplier_id=${company_id}
    Req to Server  /buy_management/contract_make  ${token}  ${req}

Del A Customer Contract
    [Arguments]  ${contract_id}
    ${req}  Create Dictionary  contract_id=${contract_id}
    Req to Server  /sale_management/contract_destroy  ${sc_admin_token}  ${req}

Del A Supplier Contract
    [Arguments]  ${contract_id}
    ${req}  Create Dictionary  contract_id=${contract_id}
    Req to Server  /buy_management/contract_destroy  ${sc_admin_token}  ${req}

Add A Stuff To Contract
    [Arguments]  ${stuff_name}  ${customer_name}  ${token}=${sc_admin_token}
    ${target_contract}  Set Variable
    ${target_stuff}  Set Variable
    ${found_contracts}  Req Get to Server  /sale_management/contract_get  ${token}  contracts
    @{stuffs_found}  Req Get to Server  /stuff/get_all  ${token}  stuff
    FOR  ${itr}  IN  @{found_contracts}
        ${buyer_name}  Get From Dictionary  ${itr}[company]  name
        IF  $buyer_name == $customer_name
            ${target_contract}  Set Variable  ${itr}
            Exit For Loop
        END
    END
    FOR  ${itr}  IN  @{stuffs_found}
        ${got_stuff_name}  Get From Dictionary  ${itr}  name
        IF  $got_stuff_name == $stuff_name
            ${target_stuff}  Set Variable  ${itr}
            Exit For Loop
        END
    END
    ${req}  Create Dictionary  stuff_id=${target_stuff}[id]  contract_id=${target_contract}[id]
    Req to Server  /sale_management/contract_add_stuff  ${token}  ${req}

Del A Stuff From Contract
    [Arguments]  ${stuff_name}  ${customer_name}
    ${target_contract}  Set Variable
    ${target_stuff}  Set Variable
    ${found_contracts}  Req Get to Server  /sale_management/contract_get  ${sc_admin_token}  contracts
    @{stuffs_found}  Req Get to Server  /stuff/get_all  ${sc_admin_token}  stuff
    FOR  ${itr}  IN  @{found_contracts}
        ${buyer_name}  Get From Dictionary  ${itr}[company]  name
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
    Req to Server  /sale_management/contract_del_stuff  ${sc_admin_token}  ${req}

Charge To A Company
    [Arguments]  ${company_id}  ${cash}  ${comment}=test_charge
    ${found_contracts}  Req Get to Server  /sale_management/contract_get  ${sc_admin_token}  contracts
    ${contract_id}  Set Variable
    FOR  ${itr}  IN  @{found_contracts}
        ${target_company_id}  Get From Dictionary  ${itr}[company]  id
        IF  $target_company_id == $company_id
            ${contract_id}  Set Variable  ${itr}[id]
            Exit For Loop
        END
    END
    ${req}  Create Dictionary  contract_id=${contract_id}   cash_increased=${cash}  comment=${comment}
    Req to Server  /cash/charge  ${sc_admin_token}  ${req}
    RETURN  ${contract_id}

Get Cash Of A Company
    [Arguments]  ${company_name}
    ${found_contracts}  Req Get to Server  /sale_management/contract_get  ${sc_admin_token}  contracts
    ${ret}  Set Variable  ${0}
    FOR  ${itr}  IN  @{found_contracts}
        ${cust_name}  Get From Dictionary  ${itr}[company]  name
        IF  $cust_name == $company_name
            ${ret}  Set Variable  ${itr}[balance]
            Exit For Loop
        END
    END
    RETURN  ${ret}

Prepare Sale and Buy
    Prepare Companies And Users
    Add A Stuff To Sale  lng  lng_comment
    Add A Stuff To Buy  LT  lt_comment
    Add A Company As Customer  ${buy_company1}[id]
    Add A Company As Supplier  ${buy_company1}[id]
    Add A Stuff To Contract  lng  bc1
    @{stuffs_found}  Req Get to Server  /customer/get_stuff_on_sale  ${bc1_user_token}  stuff
    Set Suite Variable  ${test_stuff}  ${stuffs_found}[0]
    Change Stuff Price  ${test_stuff}[id]  ${1212}
    @{stuffs_found}  Req Get to Server  /customer/get_stuff_on_sale  ${bc1_user_token}  stuff
    Set Suite Variable  ${test_stuff}  ${stuffs_found}[0]
    Authorize User to Contract  bc1  5678
    @{stuffs_found}  Req Get to Server  /supplier/get_stuff_need_buy  ${bc1_user_token}  stuff
    Set Suite Variable  ${order_stuff}  ${stuffs_found}[0]

Authorize User to Contract
    [Arguments]  ${company_name}  ${user_phone}  ${token}=${sc_admin_token}
    ${found_contracts}  Req Get to Server  /sale_management/contract_get  ${token}  contracts
    FOR  ${itr}  IN  @{found_contracts}
        ${buyer_name}  Get From Dictionary  ${itr}[company]  name
        IF  $buyer_name == $company_name
            ${req}  Create Dictionary  contract_id=${itr}[id]  phone=${user_phone}
            Req to Server  /sale_management/authorize_user  ${token}  ${req}
            Exit For Loop
        END
    END

Unauthorize User to Contract
    [Arguments]  ${company_name}  ${user_phone}
    ${found_contracts}  Req Get to Server  /sale_management/contract_get  ${sc_admin_token}  contracts
    FOR  ${itr}  IN  @{found_contracts}
        ${buyer_name}  Get From Dictionary  ${itr}[company]  name
        IF  $buyer_name == $company_name
            ${req}  Create Dictionary  contract_id=${itr}[id]  phone=${user_phone}
            Req to Server  /sale_management/unauthorize_user  ${sc_admin_token}  ${req}
            Exit For Loop
        END
    END
    Req to Server  /sale_management/unauthorize_user  ${sc_admin_token}  ${req}

Re-Add Stuff
    Add A Stuff To Sale  lng  lng_comment
    Add A Stuff To Contract  lng  bc1
    @{stuffs_found}  Req Get to Server  /customer/get_stuff_on_sale  ${bc1_user_token}  stuff
    Set Suite Variable  ${test_stuff}  ${stuffs_found}[0]
    Change Stuff Price  ${test_stuff}[id]  ${1212}
    @{stuffs_found}  Req Get to Server  /customer/get_stuff_on_sale  ${bc1_user_token}  stuff
    Set Suite Variable  ${test_stuff}  ${stuffs_found}[0]
    Add A Stuff To Buy  LT  lt_comment
    @{stuffs_found}  Req Get to Server  /supplier/get_stuff_need_buy  ${bc1_user_token}  stuff
    Set Suite Variable  ${order_stuff}  ${stuffs_found}[0]

Clean Up Sale and Buy
    Stuff Reset
    Contract Reset
    Clean Up Companies And Users

Create A Order
    [Arguments]  ${bv_id}  ${mv_id}  ${dv_id}  ${token}=${bc1_user_token}  ${plan_time}=today  ${comment}=测试备注  ${drop_address}=测试地点  ${use_for}=测试用途  ${stuff_id}=${order_stuff}[id]
    ${cur_date}  Set Variable  ${plan_time}
    IF  $plan_time == today
        ${cur_date}  Get Current Date  result_format=%Y-%m-%d
    END
    ${req}  Create Dictionary
    ...    behind_vehicle_id=${bv_id}
    ...    main_vehicle_id=${mv_id}
    ...    driver_id=${dv_id}
    ...    comment=${comment}
    ...    drop_address=${drop_address}
    ...    plan_time=${cur_date}
    ...    stuff_id=${stuff_id}
    ...    price=${23}
    ${resp}  Req to Server  /supplier/order_sale_create  ${token}  ${req}
    RETURN  ${resp}

Create A Plan
    [Arguments]  ${bv_id}  ${mv_id}  ${dv_id}  ${token}=${bc1_user_token}  ${plan_time}=today  ${comment}=测试备注  ${drop_address}=测试地点  ${use_for}=测试用途  ${stuff_id}=${test_stuff}[id]
    ${cur_date}  Set Variable  ${plan_time}
    IF  $plan_time == today
        ${cur_date}  Get Current Date  result_format=%Y-%m-%d
    END
    ${req}  Create Dictionary
    ...    behind_vehicle_id=${bv_id}
    ...    main_vehicle_id=${mv_id}
    ...    driver_id=${dv_id}
    ...    comment=${comment}
    ...    drop_address=${drop_address}
    ...    plan_time=${cur_date}
    ...    stuff_id=${stuff_id}
    ...    use_for=${use_for}
    ${resp}  Req to Server  /customer/order_buy_create  ${token}  ${req}
    RETURN  ${resp}
Confirm A Order
    [Arguments]  ${plan}  ${token}=${sc_admin_token}
    ${req}  Create Dictionary  plan_id=${plan}[id]
    Req to Server  /buy_management/order_buy_confirm  ${token}  ${req}
Confirm A Plan
    [Arguments]  ${plan}  ${token}=${sc_admin_token}
    ${req}  Create Dictionary  plan_id=${plan}[id]
    Req to Server  /sale_management/order_sale_confirm  ${token}  ${req}
Manual Pay A Plan
    [Arguments]  ${plan}  ${token}=${sc_admin_token}
    ${req}  Create Dictionary  plan_id=${plan}[id]
    Req to Server  /sale_management/order_sale_pay  ${token}  ${req}
Plan Enter
    [Arguments]  ${plan}
    ${req}  Create Dictionary  plan_id=${plan}[id]  is_exit=${False}
    Req to Server  /scale/vehicle_enter  ${sc_admin_token}  ${req}
Driver Online
    [Arguments]  ${phone}  ${open_id}  ${id_card}
    ${req}  Create Dictionary  phone_code=${phone}  open_id_code=${open_id}  id_card=${id_card}  name=dv_name
    Req to Server  /global/driver_update  none  ${req}
    ${req}  Create Dictionary   open_id_code=${open_id}
    ${resp}  Req to Server  /global/driver_online  none  ${req}
    RETURN  ${resp}
Check In A Plan
    [Arguments]  ${plan}  ${expect_fail}=${False}  ${index}=0
    ${driver}  Driver Online  ${plan}[driver][phone]  open_id_for_test  11100090909
    ${req}  Create Dictionary  open_id=${driver}[open_id]
    ${resp}  Req Get to Server  /global/driver_get_order  none  plans  -1  &{req}
    ${req}  Create Dictionary  open_id=${driver}[open_id]  plan_id=${resp[${index}]}[id]  lat=${123}  lon=${333}
    Req to Server  /global/driver_checkin  none  ${req}  ${expect_fail}
Deliver A Plan
    [Arguments]  ${plan}  ${count}
    ${req}  Create Dictionary  plan_id=${plan}[id]  p_weight=${10}  m_weight=${30}  count=${count}  p_time=2018-01-01  m_time=2018-01-01
    Req to Server  /scale/deliver  ${sc_admin_token}  ${req}
Rollback Order
    [Arguments]  ${plan}
    ${req}  Create Dictionary  plan_id=${plan}[id]  msg=reason
    Req to Server  /buy_management/order_rollback  ${sc_admin_token}  ${req}
Rollback Plan
    [Arguments]  ${plan}
    ${req}  Create Dictionary  plan_id=${plan}[id]  msg=reason
    Req to Server  /sale_management/order_rollback  ${sc_admin_token}  ${req}
Cancel Check In Plan
    [Arguments]  ${plan}
    ${req}  Create Dictionary  plan_id=${plan}[id]
    Req to Server  /scale/cancel_check_in  ${sc_admin_token}  ${req}
Search Driver by Index
    [Arguments]  ${itr}  ${token}=${bc1_user_token}
    ${req}  Create Dictionary  name=dn_${itr}  id_card=di_${itr}  phone=dp_${itr}
    ${resp}  Req to Server  /customer/fetch_driver  ${token}  ${req}
    RETURN  ${resp}
Search Main Vehicle by Index
    [Arguments]  ${itr}  ${token}=${bc1_user_token}
    ${req}  Create Dictionary  plate=mv_${itr}
    ${resp}  Req to Server  /customer/fetch_vehicle  ${token}  ${req}
    RETURN  ${resp}
Search behind Vehicle by Index
    [Arguments]  ${itr}  ${token}=${bc1_user_token}
    ${req}  Create Dictionary  plate=bv_${itr}
    ${resp}  Req to Server  /customer/fetch_vehicle  ${token}  ${req}
    RETURN  ${resp}
Search Orders Based on User
    [Arguments]  ${token}  ${is_sale}=${False}  ${status}=${null}
    ${req}  Create Dictionary  start_time=2018-01-01  end_time=2090-09-09  status=${status}
    ${url}  Set Variable  /supplier/order_sale_search
    ${data_name}  Set Variable  plans
    IF  $is_sale == False
        ${url}  Set Variable  /buy_management/order_search
    END
    ${resp}  Req Get to Server  ${url}  ${token}  ${data_name}  ${-1}  &{req}
    RETURN  ${resp}
Search Plans Based on User
    [Arguments]  ${token}  ${is_sale}=${True}  ${status}=${null}
    ${req}  Create Dictionary  start_time=2018-01-01  end_time=2090-09-09  status=${status}
    ${url}  Set Variable  /sale_management/order_search
    ${data_name}  Set Variable  plans
    IF  $is_sale == False
        ${url}  Set Variable  /customer/order_buy_search
    END
    ${resp}  Req Get to Server  ${url}  ${token}  ${data_name}  ${-1}  &{req}
    RETURN  ${resp}
Get Plan By Id
    [Arguments]  ${plan_id}
    ${resp}  Search Plans Based on User  ${sc_admin_token}
    ${more_resp}  Search Orders Based on User  ${sc_admin_token}
    ${resp}  Combine Lists  ${resp}  ${more_resp}
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
    Req to Server  /customer/order_buy_update  ${bc1_user_token}  ${update_info}

Cancel A Order
    [Arguments]  ${plan}
    ${req}  Create Dictionary  plan_id=${plan}[id]
    Req to Server  /supplier/order_sale_cancel  ${bc1_user_token}  ${req}

Cancel A Plan
    [Arguments]  ${plan}
    ${req}  Create Dictionary  plan_id=${plan}[id]
    Req to Server  /customer/order_buy_cancel  ${bc1_user_token}  ${req}

Close A Order
    [Arguments]  ${plan}
    ${req}  Create Dictionary  plan_id=${plan}[id]
    Req to Server  /buy_management/close  ${sc_admin_token}  ${req}
Close A Plan
    [Arguments]  ${plan}
    ${req}  Create Dictionary  plan_id=${plan}[id]
    Req to Server  /sale_management/close  ${sc_admin_token}  ${req}