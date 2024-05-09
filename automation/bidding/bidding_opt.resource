*** Settings ***
Resource  ../stuff/stuff_opt.resource
Library  DateTime

*** Variables ***
${total_joiner}  5
@{joiners}

*** Keywords ***
Prepare Four Costomers And One Sale
    FOR  ${index}  IN RANGE  ${total_joiner}
        ${company}  Create One Company  jc_${index}
        ${user}  New User Login  p${index}  jc_${index}  o${index}  n${index}
        ${tmp}  Create Dictionary  user_token=${user}  company=${company}  user_phone=p${index}
        Append To List  ${joiners}  ${tmp}
    END
    ${sale_company}  Create One Company  sale
    Company Set Script  ${sale_company}[id]  normal
    ${sc_admin_token}  Login As Admin Of Company  ${sale_company}[id]  1234  sc_admin
    Add Module To Company  ${sale_company}[id]  stuff
    Add Module To Company  ${sale_company}[id]  cash
    Add Module To Company  ${sale_company}[id]  scale
    Add Module To Company  ${sale_company}[id]  sc
    Add Module To Company  ${sale_company}[id]  bid
    Add Module To Company  ${sale_company}[id]  sale_management
    Add Module To User  ${sc_admin_token}  1234  stuff
    Add Module To User  ${sc_admin_token}  1234  cash
    Add Module To User  ${sc_admin_token}  1234  scale
    Add Module To User  ${sc_admin_token}  1234  sc
    Add Module To User  ${sc_admin_token}  1234  bid
    Add Module To User  ${sc_admin_token}  1234  sale_management
    Set Suite Variable  ${sc_admin_token}
    ${test_stuff}  Add A Stuff To Sale  lng  lng_comment
    Set Suite Variable  ${test_stuff}
    FOR  ${itr}  IN  @{joiners}
        Add A Stuff To Sale  lng  lng_comment
        Add A Company As Customer  ${itr}[company][id]
        Add A Stuff To Contract  lng  ${itr}[company][name]
        Set Suite Variable  ${test_stuff}
        Authorize User to Contract  ${itr}[company][name]  ${itr}[user_phone]
    END

Cleanup Joiner
    Stuff Reset
    Contract Reset
    Clean Up Companies And Users

Create A Bidding
    [Arguments]  ${stuff}  ${total_turn}=${2}  ${pay_first}=${0}
    ${req}  Create Dictionary  stuff_id=${stuff}[id]  total=${50}
    ...    comment=abcd  min=${10}  max=${1000}  total_turn=${total_turn}  pay_first=${pay_first}
    ${resp}  Req to Server  /bid/create  ${sc_admin_token}  ${req}
    RETURN  ${resp}

Add All Customer To Bidding Except First One
    [Arguments]  ${bc_id}  ${begin_time}=2020-02-02  ${end_time}=2040-10-10
    ${req}  Create Dictionary  stuff_id=${test_stuff}[id]
    ${found_contracts}  Req Get to Server  /sale_management/contract_get  ${sc_admin_token}  contracts  ${-1}  &{req}
    @{joiner_ids}  Create List
    FOR  ${itr}  IN  @{found_contracts}
        ${au_users}  Get From Dictionary  ${itr}  rbac_users
        FOR  ${sub_itr}  IN  @{au_users}
            ${tmp}  Create Dictionary  id=${sub_itr}[id]
            Append To List  ${joiner_ids}  ${tmp}
        END
    END
    Remove From List  ${joiner_ids}  -1
    ${req}  Create Dictionary  bc_id=${bc_id}  joiner_ids=${joiner_ids}  begin_time=${begin_time}  end_time=${end_time}
    Req to Server  /bid/add_turn  ${sc_admin_token}  ${req}
Customer Accept Bidding
    [Arguments]  ${token}
    ${resp}  Req Get to Server  /customer/bidding_search  ${token}  items
    ${req}  Create Dictionary  item_id=${resp}[0][id]
    Req to Server  /customer/bidding_accept  ${token}  ${req}
Customer Price Out
    [Arguments]  ${token}  ${price}
    ${resp}  Req Get to Server  /customer/bidding_search  ${token}  items
    ${req}  Create Dictionary  item_id=${resp}[0][id]  price=${price}
    Req to Server  /customer/bidding_price  ${token}  ${req}

Move Bidding Date
    [Arguments]  ${to_furture}=${True}
    ${resp}  Req Get to Server  /bid/get_all_created  ${sc_admin_token}  biddings
    ${future_begin_time}  Get Current Date  increment=-5hours  result_format=%Y-%m-%d %H:%M:%S
    IF  ${to_furture}
        ${future_begin_time}  Get Current Date  increment=5hours  result_format=%Y-%m-%d %H:%M:%S
    END
    Change Bidding Begin Time  ${resp}[0][bidding_turns][0][id]  ${future_begin_time}
Go Next Turn
    [Arguments]  ${bc_id}  ${top_n}=${2}
    ${req}  Create Dictionary  bc_id=${bc_id}  begin_time=2020-02-02  end_time=2020-02-02  top_n=${top_n}
    Req to Server  /bid/next_turn  ${sc_admin_token}  ${req}