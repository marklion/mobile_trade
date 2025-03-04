*** Settings ***
Resource  ../stuff/stuff_opt.resource
Library  DateTime

*** Variables ***
${total_joiner}  5
@{joiners}
${default_price_v_code}  abcd

*** Keywords ***
Prepare Four Costomers And One Sale
    FOR  ${index}  IN RANGE  ${total_joiner}
        ${company}  Create One Company  jc_${index}
        ${user}  New User Login  p${index}  jc_${index}  o${index}  n${index}
        ${tmp}  Create Dictionary  user_token=${user}  company=${company}  user_phone=p${index}  open_id=o${index}  name=n${index}
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
    [Arguments]  ${stuff}  ${total_turn}=${2}  ${pay_first}=${0}  ${price_hide}=${False}
    ${req}  Create Dictionary  stuff_id=${stuff}[id]  total=${50}
    ...    comment=abcd  min=${10}  max=${1000}  total_turn=${total_turn}  pay_first=${pay_first}
    ...    price_hide=${price_hide}
    ${resp}  Req to Server  /bid/create  ${sc_admin_token}  ${req}
    RETURN  ${resp}

Add All Customer To Bidding Except First One
    [Arguments]  ${bc_id}  ${begin_time}=2020-02-02  ${end_time}=2040-10-10
    ${req}  Create Dictionary  stuff_id=${test_stuff}[id]
    ${found_contracts}  Req Get to Server  /sale_management/contract_get  ${sc_admin_token}  contracts  ${-1}  &{req}
    @{joiner_ids}  Create List
    FOR  ${itr}  IN  @{found_contracts}
        ${au_users}  Get From Dictionary  ${itr}  rbac_users  ${EMPTY}
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
    ${req}  Create Dictionary  item_id=${resp}[0][id]  price=${price} v_code=${default_price_v_code}
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

Confirm One Bidding
    [Arguments]  ${bc_id}  ${token}  ${exception}=${False}
    ${req}  Create Dictionary  bidding_id=${bc_id}
    Req to Server  /customer/bidding_confirm  ${token}  ${req}  ${exception}

Prepare One Finish Bidding
    [Documentation]  create a bidding and spicify someone to win, return the bidding_config and winner
    ${added_one}  Create A Bidding  ${test_stuff}  ${1}
    Add All Customer To Bidding Except First One  ${added_one}[id]
    Move Bidding Date
    Customer Accept Bidding  ${joiners}[1][user_token]
    Customer Accept Bidding  ${joiners}[2][user_token]
    Customer Accept Bidding  ${joiners}[3][user_token]
    Move Bidding Date  ${False}
    Customer Price Out  ${joiners}[1][user_token]  ${199}
    Customer Price Out  ${joiners}[2][user_token]  ${200}
    Customer Price Out  ${joiners}[3][user_token]  ${50}

    RETURN  ${added_one}  ${joiners}[2]  ${200}

Create Bidding Plan
    [Arguments]  ${bc_id}  ${token}  ${exception}=${False}
    ${mv}  Search Main Vehicle by Index  0  ${token}
    ${bv}  Search behind Vehicle by Index  0  ${token}
    ${dv}  Search Driver by Index  0  ${token}
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]  token=${token}  exception=${exception}  bidding_id=${bc_id}

    RETURN  ${plan}