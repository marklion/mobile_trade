*** Settings ***
Resource  ../api_base.resource
Resource  ../database.resource
Resource  ../rbac/rbac_curd.resource
Resource  group.resource
Library  DateTime
Library  Collections

Suite Setup       Group Contract Suite Reset
Suite Teardown    Group Contract Suite Reset

*** Variables ***
${PARENT_PHONE}  16600000011
${MEMBER_PHONE}  16600000012
${BUYER_PHONE}  16600000013

*** Keywords ***
Group Contract Suite Reset
    Group Tables Reset
    Contract Reset
    Plan Reset
    Stuff Reset
    RBAC reset
    Company Reset

Setup Group Contract Scenario
    ${parent}  Create One Company  gc_parent
    ${member}  Create One Company  gc_member
    ${buyer}  Create One Company  gc_buyer

    ${parent_token}  Login As Admin Of Company  ${parent}[id]  ${PARENT_PHONE}  gc_parent_admin
    ${member_token}  Login As Admin Of Company  ${member}[id]  ${MEMBER_PHONE}  gc_member_admin
    ${buyer_token}  Login As Admin Of Company  ${buyer}[id]  ${BUYER_PHONE}  gc_buyer_admin

    ${parent_self}  Get Self Info  ${parent_token}
    Convert To Group By Super Admin  ${parent}[id]  ${parent_self}[id]
    ${add_member_req}  Create Dictionary  member_company_id=${member}[id]
    Req to Server  /group/group_member_add  ${parent_token}  ${add_member_req}
    Group Grant Upsert Self On Member  ${parent_token}  ${member}[id]  ${parent_self}[id]  ${True}  ${True}

    Add Module To Company  ${parent}[id]  sale_management
    Add Module To Company  ${parent}[id]  cash
    Add Module To Company  ${parent}[id]  scale
    Add Module To User  ${parent_token}  ${PARENT_PHONE}  sale_management
    Add Module To User  ${parent_token}  ${PARENT_PHONE}  cash
    Add Module To User  ${parent_token}  ${PARENT_PHONE}  scale

    Add Module To Company  ${member}[id]  stuff
    Add Module To User  ${member_token}  ${MEMBER_PHONE}  stuff

    Add Module To Company  ${buyer}[id]  customer
    Add Module To User  ${buyer_token}  ${BUYER_PHONE}  customer

    ${new_stuff_req}  Create Dictionary  name=gc_member_stuff  comment=member_source  expect_count=${2}
    ${member_stuff}  Req to Server  /stuff/fetch  ${member_token}  ${new_stuff_req}
    ${price_req}  Create Dictionary  stuff_id=${member_stuff}[id]  price=${100}  to_plan=${False}  comment=group_test
    Req to Server  /stuff/change_price  ${member_token}  ${price_req}

    ${new_contract_req}  Create Dictionary  customer_id=${buyer}[id]
    Req to Server  /sale_management/contract_make  ${parent_token}  ${new_contract_req}
    ${auth_req}  Create Dictionary  contract_id=${0}  phone=${BUYER_PHONE}
    ${contract}  Req to Server  /sale_management/get_contract_by_customer  ${parent_token}  ${new_contract_req}
    Set To Dictionary  ${auth_req}  contract_id=${contract}[id]
    Req to Server  /sale_management/authorize_user  ${parent_token}  ${auth_req}
    ${contract_stuff_req}  Create Dictionary  contract_id=${contract}[id]  stuff_id=${member_stuff}[id]
    Req to Server  /sale_management/contract_add_stuff  ${parent_token}  ${contract_stuff_req}

    Set Suite Variable  ${PARENT_TOKEN}  ${parent_token}
    Set Suite Variable  ${BUYER_TOKEN}  ${buyer_token}
    Set Suite Variable  ${BUYER_COMPANY}  ${buyer}
    Set Suite Variable  ${MEMBER_STUFF}  ${member_stuff}

Find Stuff Id In List
    [Arguments]  @{stuff_list}
    ${hit}  Set Variable  ${False}
    FOR  ${s}  IN  @{stuff_list}
        IF  ${s}[id] == ${MEMBER_STUFF}[id]
            ${hit}  Set Variable  ${True}
            Exit For Loop
        END
    END
    RETURN  ${hit}

Get Sale Plan By Id
    [Arguments]  ${plan_id}
    ${today}  Get Current Date  result_format=%Y-%m-%d
    ${req}  Create Dictionary  start_time=${today}  end_time=${today}
    ${plans}  Req Get to Server  /customer/order_buy_search  ${BUYER_TOKEN}  plans  ${-1}  &{req}
    ${target}  Set Variable  ${None}
    FOR  ${p}  IN  @{plans}
        IF  ${p}[id] == ${plan_id}
            ${target}  Set Variable  ${p}
            Exit For Loop
        END
    END
    Should Not Be Equal  ${target}  ${None}
    RETURN  ${target}

*** Test Cases ***
Group Contract Can Select Member Stuff
    [Setup]  Setup Group Contract Scenario
    ${opt_req}  Create Dictionary  pageNo=${0}
    ${opt_resp}  Req to Server  /sale_management/get_stuff_for_contract  ${PARENT_TOKEN}  ${opt_req}
    ${hit1}  Find Stuff Id In List  @{opt_resp}[stuff]
    Should Be True  ${hit1}
    ${on_sale_req}  Create Dictionary  pageNo=${0}
    ${on_sale_resp}  Req to Server  /customer/get_stuff_on_sale  ${BUYER_TOKEN}  ${on_sale_req}
    ${hit2}  Find Stuff Id In List  @{on_sale_resp}[stuff]
    Should Be True  ${hit2}

VerifyPayAndCloseUseGroupCustomerContract
    [Setup]  Setup Group Contract Scenario
    ${driver_req}  Create Dictionary  name=gc_driver  phone=16600000099
    ${driver}  Req to Server  /customer/fetch_driver  ${BUYER_TOKEN}  ${driver_req}
    ${main_req}  Create Dictionary  plate=京A12345
    ${main_vehicle}  Req to Server  /customer/fetch_vehicle  ${BUYER_TOKEN}  ${main_req}
    ${behind_req}  Create Dictionary  plate=京A54321
    ${behind_vehicle}  Req to Server  /customer/fetch_vehicle  ${BUYER_TOKEN}  ${behind_req}
    ${today}  Get Current Date  result_format=%Y-%m-%d
    ${create_req}  Create Dictionary
    ...  plan_time=${today}
    ...  use_for=group-test
    ...  drop_address=addr
    ...  stuff_id=${MEMBER_STUFF}[id]
    ...  main_vehicle_id=${main_vehicle}[id]
    ...  behind_vehicle_id=${behind_vehicle}[id]
    ...  driver_id=${driver}[id]
    ${plan}  Req to Server  /customer/order_buy_create  ${BUYER_TOKEN}  ${create_req}

    ${confirm_req}  Create Dictionary  plan_id=${plan}[id]
    Req to Server  /sale_management/order_sale_confirm  ${PARENT_TOKEN}  ${confirm_req}
    ${plan_after_confirm}  Get Sale Plan By Id  ${plan}[id]
    Should Be Equal As Integers  ${plan_after_confirm}[status]  1

    ${contract_req}  Create Dictionary  customer_id=${BUYER_COMPANY}[id]
    ${contract_before}  Req to Server  /sale_management/get_contract_by_customer  ${PARENT_TOKEN}  ${contract_req}
    ${charge_req}  Create Dictionary  contract_id=${contract_before}[id]  cash_increased=${400}  comment=group-balance
    Req to Server  /cash/charge  ${PARENT_TOKEN}  ${charge_req}
    Sleep  2s
    ${plan_after_charge}  Get Sale Plan By Id  ${plan}[id]
    Should Be Equal As Integers  ${plan_after_charge}[status]  2

    ${deliver_req}  Create Dictionary
    ...  plan_id=${plan}[id]
    ...  p_weight=${10}
    ...  m_weight=${20}
    ...  count=${1}
    ...  p_time=2026-01-01 10:00:00
    ...  m_time=2026-01-01 10:10:00
    Req to Server  /scale/deliver  ${PARENT_TOKEN}  ${deliver_req}
    Sleep  1s

    ${contract_after}  Req to Server  /sale_management/get_contract_by_customer  ${PARENT_TOKEN}  ${contract_req}
    Should Be Equal As Numbers  ${contract_after}[balance]  300

RollbackAfterCloseRestoresGroupCustomerContractBalance
    [Setup]  Setup Group Contract Scenario
    ${driver_req}  Create Dictionary  name=gc_driver_rb  phone=16600000098
    ${driver}  Req to Server  /customer/fetch_driver  ${BUYER_TOKEN}  ${driver_req}
    ${main_req}  Create Dictionary  plate=京A12346
    ${main_vehicle}  Req to Server  /customer/fetch_vehicle  ${BUYER_TOKEN}  ${main_req}
    ${behind_req}  Create Dictionary  plate=京A54322
    ${behind_vehicle}  Req to Server  /customer/fetch_vehicle  ${BUYER_TOKEN}  ${behind_req}
    ${today}  Get Current Date  result_format=%Y-%m-%d
    ${create_req}  Create Dictionary
    ...  plan_time=${today}
    ...  use_for=group-test-rollback
    ...  drop_address=addr
    ...  stuff_id=${MEMBER_STUFF}[id]
    ...  main_vehicle_id=${main_vehicle}[id]
    ...  behind_vehicle_id=${behind_vehicle}[id]
    ...  driver_id=${driver}[id]
    ${plan}  Req to Server  /customer/order_buy_create  ${BUYER_TOKEN}  ${create_req}

    ${confirm_req}  Create Dictionary  plan_id=${plan}[id]
    Req to Server  /sale_management/order_sale_confirm  ${PARENT_TOKEN}  ${confirm_req}
    ${plan_after_confirm}  Get Sale Plan By Id  ${plan}[id]
    Should Be Equal As Integers  ${plan_after_confirm}[status]  1

    ${contract_req}  Create Dictionary  customer_id=${BUYER_COMPANY}[id]
    ${contract_before}  Req to Server  /sale_management/get_contract_by_customer  ${PARENT_TOKEN}  ${contract_req}
    ${charge_req}  Create Dictionary  contract_id=${contract_before}[id]  cash_increased=${400}  comment=group-balance-rollback
    Req to Server  /cash/charge  ${PARENT_TOKEN}  ${charge_req}
    Sleep  2s
    ${plan_after_charge}  Get Sale Plan By Id  ${plan}[id]
    Should Be Equal As Integers  ${plan_after_charge}[status]  2

    ${deliver_req}  Create Dictionary
    ...  plan_id=${plan}[id]
    ...  p_weight=${10}
    ...  m_weight=${20}
    ...  count=${1}
    ...  p_time=2026-01-01 11:00:00
    ...  m_time=2026-01-01 11:10:00
    Req to Server  /scale/deliver  ${PARENT_TOKEN}  ${deliver_req}
    Sleep  1s
    ${contract_after_close}  Req to Server  /sale_management/get_contract_by_customer  ${PARENT_TOKEN}  ${contract_req}
    Should Be Equal As Numbers  ${contract_after_close}[balance]  300

    ${rollback_req}  Create Dictionary  plan_id=${plan}[id]  msg=rollback-after-close
    Req to Server  /sale_management/order_rollback  ${PARENT_TOKEN}  ${rollback_req}
    Sleep  1s
    ${plan_after_rollback}  Get Sale Plan By Id  ${plan}[id]
    Should Be Equal As Integers  ${plan_after_rollback}[status]  2
    Should Be Equal As Numbers  ${plan_after_rollback}[count]  0
    ${contract_after_rollback}  Req to Server  /sale_management/get_contract_by_customer  ${PARENT_TOKEN}  ${contract_req}
    Should Be Equal As Numbers  ${contract_after_rollback}[balance]  400
