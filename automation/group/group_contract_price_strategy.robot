*** Settings ***
Resource  ../api_base.resource
Resource  ../database.resource
Resource  ../rbac/rbac_curd.resource
Resource  group.resource
Library  DateTime
Library  Collections

Suite Setup       Group Contract Price Suite Reset
Suite Teardown    Group Contract Price Suite Reset

*** Keywords ***
Group Contract Price Suite Reset
    Group Tables Reset
    Contract Reset
    Plan Reset
    Stuff Reset
    RBAC reset
    Company Reset
    Clear Table  contract_discount_scheme
    Clear Table  contract_stuff_price

Setup Group Contract Price Scenario
    [Arguments]  ${can_operate}=${True}
    ${suffix}  Evaluate  random.randint(100000, 999999)  modules=random
    ${parent_name}  Set Variable  gcp_parent_${suffix}
    ${member_name}  Set Variable  gcp_member_${suffix}
    ${buyer_name}  Set Variable  gcp_buyer_${suffix}
    ${phone_tail}  Evaluate  random.randint(100, 999)  modules=random
    ${parent_phone}  Set Variable  16710000${phone_tail}
    ${member_phone}  Set Variable  16720000${phone_tail}
    ${buyer_phone}  Set Variable  16730000${phone_tail}

    ${parent}  Create One Company  ${parent_name}
    ${member}  Create One Company  ${member_name}
    ${buyer}  Create One Company  ${buyer_name}

    ${parent_token}  Login As Admin Of Company  ${parent}[id]  ${parent_phone}  gcp_parent_admin_${suffix}
    ${member_token}  Login As Admin Of Company  ${member}[id]  ${member_phone}  gcp_member_admin_${suffix}
    ${buyer_token}  Login As Admin Of Company  ${buyer}[id]  ${buyer_phone}  gcp_buyer_admin_${suffix}

    ${parent_self}  Get Self Info  ${parent_token}
    Convert To Group By Super Admin  ${parent}[id]  ${parent_self}[id]
    ${add_member_req}  Create Dictionary  member_company_id=${member}[id]
    Req to Server  /group/group_member_add  ${parent_token}  ${add_member_req}
    Group Grant Upsert Self On Member  ${parent_token}  ${member}[id]  ${parent_self}[id]  ${True}  ${can_operate}
    Assert Group Grant Can Operate  ${parent_token}  ${member}[id]  ${parent_self}[id]  ${can_operate}

    Add Module To Company  ${parent}[id]  sale_management
    Add Module To User  ${parent_token}  ${parent_phone}  sale_management
    Add Module To Company  ${member}[id]  stuff
    Add Module To User  ${member_token}  ${member_phone}  stuff
    Add Module To Company  ${buyer}[id]  customer
    Add Module To User  ${buyer_token}  ${buyer_phone}  customer

    ${new_stuff_req}  Create Dictionary  name=gcp_member_stuff_${suffix}  comment=member_source  expect_count=${2}
    ${member_stuff}  Req to Server  /stuff/fetch  ${member_token}  ${new_stuff_req}
    ${price_req}  Create Dictionary  stuff_id=${member_stuff}[id]  price=${100}  to_plan=${False}  comment=group_contract_price_test
    Req to Server  /stuff/change_price  ${member_token}  ${price_req}

    ${new_contract_req}  Create Dictionary  customer_id=${buyer}[id]
    Req to Server  /sale_management/contract_make  ${parent_token}  ${new_contract_req}
    ${contract}  Req to Server  /sale_management/get_contract_by_customer  ${parent_token}  ${new_contract_req}
    ${contract_stuff_req}  Create Dictionary
    ...  contract_id=${contract}[id]
    ...  stuff_id=${member_stuff}[id]
    Req to Server  /sale_management/contract_add_stuff  ${parent_token}  ${contract_stuff_req}

    Set Suite Variable  ${PARENT_TOKEN}  ${parent_token}
    Set Suite Variable  ${BUYER_TOKEN}  ${buyer_token}
    Set Suite Variable  ${MEMBER_COMPANY}  ${member}
    Set Suite Variable  ${MEMBER_STUFF}  ${member_stuff}
    Set Suite Variable  ${CONTRACT}  ${contract}

Assert Group Grant Can Operate
    [Arguments]  ${token}  ${member_company_id}  ${user_id}  ${expected_can_operate}
    ${empty}  Create Dictionary
    ${grant_resp}  Req to Server  /group/group_grant_list  ${token}  ${empty}
    ${found}  Set Variable  ${False}
    FOR  ${g}  IN  @{grant_resp}[grants]
        IF  ${g}[member_company_id] == ${member_company_id} and ${g}[user_id] == ${user_id}
            ${found}  Set Variable  ${True}
            Should Be Equal  ${g}[can_operate]  ${expected_can_operate}
            Exit For Loop
        END
    END
    Should Be True  ${found}

Find Discount Scheme Id By Name
    [Arguments]  ${token}  ${member_company_id}  ${scheme_name}
    ${list_req}  Create Dictionary  stat_context_company_id=${member_company_id}
    ${resp}  Req to Server  /sale_management/discount_scheme_list  ${token}  ${list_req}
    ${sid}  Set Variable  ${0}
    FOR  ${s}  IN  @{resp}[schemes]
        IF  '${s}[name]' == '${scheme_name}'
            ${sid}  Set Variable  ${s}[id]
            Exit For Loop
        END
    END
    Should Not Be Equal As Integers  ${sid}  ${0}
    RETURN  ${sid}

Create Buyer Plan With Member Stuff
    [Arguments]  ${idx}=0
    ${driver_phone}  Evaluate  16790000 + ${idx}
    ${driver_phone}  Convert To String  ${driver_phone}
    ${driver_req}  Create Dictionary  name=gcp_driver_${idx}  phone=${driver_phone}
    ${driver}  Req to Server  /customer/fetch_driver  ${BUYER_TOKEN}  ${driver_req}
    ${main_plate}  Set Variable  京GCP${idx}1
    ${behind_plate}  Set Variable  京GCP${idx}2
    ${main_req}  Create Dictionary  plate=${main_plate}
    ${behind_req}  Create Dictionary  plate=${behind_plate}
    ${main_vehicle}  Req to Server  /customer/fetch_vehicle  ${BUYER_TOKEN}  ${main_req}
    ${behind_vehicle}  Req to Server  /customer/fetch_vehicle  ${BUYER_TOKEN}  ${behind_req}
    ${today}  Get Current Date  result_format=%Y-%m-%d
    ${create_req}  Create Dictionary
    ...  plan_time=${today}
    ...  use_for=group-contract-price-test
    ...  drop_address=test-addr
    ...  stuff_id=${MEMBER_STUFF}[id]
    ...  main_vehicle_id=${main_vehicle}[id]
    ...  behind_vehicle_id=${behind_vehicle}[id]
    ...  driver_id=${driver}[id]
    ${plan}  Req to Server  /customer/order_buy_create  ${BUYER_TOKEN}  ${create_req}
    RETURN  ${plan}

*** Test Cases ***
Group CanOperate User Can Set Scheme And Stuff Override Price
    [Setup]  Setup Group Contract Price Scenario  ${True}
    ${save_scheme_req}  Create Dictionary
    ...  name=单价-1.6元
    ...  delta_price=${-1.6}
    ...  stat_context_company_id=${MEMBER_COMPANY}[id]
    Req to Server  /sale_management/discount_scheme_upsert  ${PARENT_TOKEN}  ${save_scheme_req}
    ${scheme_id}  Find Discount Scheme Id By Name  ${PARENT_TOKEN}  ${MEMBER_COMPANY}[id]  单价-1.6元

    ${set_scheme_req}  Create Dictionary
    ...  contract_id=${CONTRACT}[id]
    ...  scheme_id=${scheme_id}
    ...  stat_context_company_id=${MEMBER_COMPANY}[id]
    Req to Server  /sale_management/contract_set_discount_scheme  ${PARENT_TOKEN}  ${set_scheme_req}

    ${set_override_req}  Create Dictionary
    ...  contract_id=${CONTRACT}[id]
    ...  stuff_id=${MEMBER_STUFF}[id]
    ...  unit_price=${97.5}
    ...  stat_context_company_id=${MEMBER_COMPANY}[id]
    Req to Server  /sale_management/contract_set_stuff_price  ${PARENT_TOKEN}  ${set_override_req}

    ${plan}  Create Buyer Plan With Member Stuff  ${11}
    Should Be Equal As Numbers  ${plan}[unit_price]  97.5

Group CanOperate User Price Falls Back To Scheme When No Override
    [Setup]  Setup Group Contract Price Scenario  ${True}
    ${save_scheme_req}  Create Dictionary
    ...  name=单价-1.6元
    ...  delta_price=${-1.6}
    ...  stat_context_company_id=${MEMBER_COMPANY}[id]
    Req to Server  /sale_management/discount_scheme_upsert  ${PARENT_TOKEN}  ${save_scheme_req}
    ${scheme_id}  Find Discount Scheme Id By Name  ${PARENT_TOKEN}  ${MEMBER_COMPANY}[id]  单价-1.6元

    ${set_scheme_req}  Create Dictionary
    ...  contract_id=${CONTRACT}[id]
    ...  scheme_id=${scheme_id}
    ...  stat_context_company_id=${MEMBER_COMPANY}[id]
    Req to Server  /sale_management/contract_set_discount_scheme  ${PARENT_TOKEN}  ${set_scheme_req}

    ${plan}  Create Buyer Plan With Member Stuff  ${12}
    Should Be Equal As Numbers  ${plan}[unit_price]  98.4

Group ViewOnly User Cannot Configure Member Company Price Strategy
    [Setup]  Setup Group Contract Price Scenario  ${False}
    ${save_scheme_req}  Create Dictionary
    ...  name=单价-1元
    ...  delta_price=${-1}
    ...  stat_context_company_id=${MEMBER_COMPANY}[id]
    ${err1}  Req to Server  /sale_management/discount_scheme_upsert  ${PARENT_TOKEN}  ${save_scheme_req}  ${True}
    Should Contain  ${err1}  无权限

    ${set_override_req}  Create Dictionary
    ...  contract_id=${CONTRACT}[id]
    ...  stuff_id=${MEMBER_STUFF}[id]
    ...  unit_price=${96}
    ...  stat_context_company_id=${MEMBER_COMPANY}[id]
    ${err2}  Req to Server  /sale_management/contract_set_stuff_price  ${PARENT_TOKEN}  ${set_override_req}  ${True}
    Should Contain  ${err2}  无权限
