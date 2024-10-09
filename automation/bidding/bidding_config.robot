*** Settings ***
Resource  bidding_opt.resource
Suite Setup  Prepare Four Costomers And One Sale
Suite Teardown  Cleanup Joiner

*** Test Cases ***
Bidding Create And Check
    [Teardown]  Bidding Reset
    ${added_one}  Create A Bidding  ${test_stuff}
    Add All Customer To Bidding Except First One  ${added_one}[id]
    ${added_one}  Req Get to Server  /bid/get_all_created  ${sc_admin_token}  biddings
    ${added_one}  Set Variable  ${added_one}[0]
    Should Be Equal As Integers  ${added_one}[status]  0
    FOR  ${index}  IN RANGE  1  ${total_joiner}
        ${itr}  Set Variable  ${joiners}[${index}]
        ${resp}  Req Get to Server  /customer/bidding_search  ${itr}[user_token]  items
        Should Be Equal As Strings  ${resp}[0][accept]  ${False}
        Should Be Equal As Strings  ${resp}[0][price]  ${0}
        Should Be Equal As Integers  ${added_one}[id]  ${resp}[0][bidding_turn][bidding_config][id]
        Should Be Equal As Integers  ${added_one}[bidding_turns][0][id]  ${resp}[0][bidding_turn][id]
    END
    ${resp}  Req Get to Server  /customer/bidding_search  ${joiners}[0][user_token]  items
    Length Should Be  ${resp}  0
    FOR  ${itr}  IN RANGE   82
        ${added_one}  Create A Bidding  ${test_stuff}
    END
    ${resp}  Req Get to Server  /bid/get_all_created  ${sc_admin_token}  biddings
    Length Should Be  ${resp}  83
Accept And Bid
    [Teardown]  Bidding Reset
    ${added_one}  Create A Bidding  ${test_stuff}
    Add All Customer To Bidding Except First One  ${added_one}[id]
    ${resp}  Req Get to Server  /customer/bidding_search  ${joiners}[1][user_token]  items
    ${req}  Create Dictionary  item_id=${resp}[0][id]
    Req to Server  /customer/bidding_accept  ${joiners}[1][user_token]  ${req}  ${True}
    Move Bidding Date
    Customer Accept Bidding  ${joiners}[1][user_token]
    ${resp}  Req Get to Server  /customer/bidding_search  ${joiners}[1][user_token]  items
    ${req}  Create Dictionary  item_id=${resp}[0][id]
    Req to Server  /customer/bidding_accept  ${joiners}[2][user_token]  ${req}  ${True}
    Customer Accept Bidding  ${joiners}[2][user_token]
    ${resp}  Req Get to Server  /bid/get_all_created  ${sc_admin_token}  biddings
    Should Be True  ${resp}[0][bidding_turns][0][bidding_items][0][accept]
    Should Be True  ${resp}[0][bidding_turns][0][bidding_items][1][accept]
    Should Not Be True  ${resp}[0][bidding_turns][0][bidding_items][2][accept]
Give Out Price And Finish One Turn
    [Teardown]  Bidding Reset
    ${added_one}  Create A Bidding  ${test_stuff}
    Add All Customer To Bidding Except First One  ${added_one}[id]
    Move Bidding Date
    Customer Accept Bidding  ${joiners}[1][user_token]
    Customer Accept Bidding  ${joiners}[2][user_token]
    Customer Accept Bidding  ${joiners}[3][user_token]
    ${resp}  Req Get to Server  /customer/bidding_search  ${joiners}[1][user_token]  items
    ${req}  Create Dictionary  item_id=${resp}[0][id]  price=${100}
    Req to Server  /customer/bidding_price  ${joiners}[2][user_token]  ${req}  ${True}
    ${resp}  Req Get to Server  /customer/bidding_search  ${joiners}[1][user_token]  items
    ${req}  Create Dictionary  item_id=${resp}[0][id]  price=${100}
    Req to Server  /customer/bidding_price  ${joiners}[1][user_token]  ${req}  ${True}

    Move Bidding Date  ${False}
    Customer Price Out  ${joiners}[1][user_token]  ${100}
    ${resp}  Req Get to Server  /bid/get_all_created  ${sc_admin_token}  biddings
    Should Be Equal As Numbers  ${resp}[0][bidding_turns][0][bidding_items][0][price]  100
    Customer Price Out  ${joiners}[2][user_token]  ${200}
    ${resp}  Req Get to Server  /bid/get_all_created  ${sc_admin_token}  biddings
    Should Be Equal As Numbers  ${resp}[0][bidding_turns][0][bidding_items][0][price]  200
    Customer Price Out  ${joiners}[3][user_token]  ${50}
    ${resp}  Req Get to Server  /bid/get_all_created  ${sc_admin_token}  biddings
    Should Be Equal As Numbers  ${resp}[0][bidding_turns][0][bidding_items][0][price]  200
    Should Be True  ${resp}[0][bidding_turns][0][finish]

    ${resp}  Req Get to Server  /customer/bidding_search  ${joiners}[1][user_token]  items
    ${req}  Create Dictionary  item_id=${resp}[0][id]  price=${100}
    Req to Server  /customer/bidding_price  ${joiners}[1][user_token]  ${req}  ${True}
    ${resp}  Req Get to Server  /customer/bidding_search  ${joiners}[4][user_token]  items
    ${req}  Create Dictionary  item_id=${resp}[0][id]  price=${100}
    Req to Server  /customer/bidding_price  ${joiners}[4][user_token]  ${req}  ${True}

Begin Next Turn
    [Teardown]  Bidding Reset
    ${added_one}  Create A Bidding  ${test_stuff}
    Add All Customer To Bidding Except First One  ${added_one}[id]
    Move Bidding Date
    Customer Accept Bidding  ${joiners}[1][user_token]
    Customer Accept Bidding  ${joiners}[2][user_token]
    Customer Accept Bidding  ${joiners}[3][user_token]
    Move Bidding Date  ${False}
    Customer Price Out  ${joiners}[1][user_token]  ${100}
    Customer Price Out  ${joiners}[2][user_token]  ${200}
    Customer Price Out  ${joiners}[3][user_token]  ${50}
    Go Next Turn  ${added_one}[id]
    ${resp}  Req Get to Server  /bid/get_all_created  ${sc_admin_token}  biddings
    Length Should Be  ${resp}[0][bidding_turns]  2
    Length Should Be  ${resp}[0][bidding_turns][0][bidding_items]  2
    Should Be Equal As Integers  ${resp}[0][bidding_turns][0][turn]  1
    Should Be True  ${resp}[0][bidding_turns][0][bidding_items][0][accept]
    Should Be True  ${resp}[0][bidding_turns][0][bidding_items][1][accept]
    Should Be Equal As Numbers  ${resp}[0][bidding_turns][0][bidding_items][0][price]  0
    Should Be Equal As Numbers  ${resp}[0][bidding_turns][0][bidding_items][1][price]  0
    Should Be Equal As Integers  ${resp}[0][status]  0

Continue Complate Bidding
    [Teardown]  Bidding Reset
    ${added_one}  Create A Bidding  ${test_stuff}
    Add All Customer To Bidding Except First One  ${added_one}[id]
    Move Bidding Date
    Customer Accept Bidding  ${joiners}[1][user_token]
    Customer Accept Bidding  ${joiners}[2][user_token]
    Customer Accept Bidding  ${joiners}[3][user_token]
    Move Bidding Date  ${False}
    Customer Price Out  ${joiners}[1][user_token]  ${100}
    Customer Price Out  ${joiners}[2][user_token]  ${200}
    Customer Price Out  ${joiners}[3][user_token]  ${50}
    Go Next Turn  ${added_one}[id]
    Move Bidding Date  ${False}
    Customer Price Out  ${joiners}[1][user_token]  ${300}
    Customer Price Out  ${joiners}[2][user_token]  ${280}
    ${resp}  Req Get to Server  /bid/get_all_created  ${sc_admin_token}  biddings
    Should Be Equal As Numbers  ${resp}[0][bidding_turns][0][bidding_items][0][price]  300
    Should Be True  ${resp}[0][bidding_turns][0][finish]
    Should Be Equal As Integers  ${resp}[0][status]  1

Confirm Bidding When Two Turn Finished
    [Teardown]  Bidding Reset
    ${added_one}  Create A Bidding  ${test_stuff}  ${2}
    Add All Customer To Bidding Except First One  ${added_one}[id]
    Move Bidding Date
    Customer Accept Bidding  ${joiners}[1][user_token]
    Customer Accept Bidding  ${joiners}[2][user_token]
    Customer Accept Bidding  ${joiners}[3][user_token]
    Move Bidding Date  ${False}
    Customer Price Out  ${joiners}[1][user_token]  ${199}
    Customer Price Out  ${joiners}[2][user_token]  ${200}
    Customer Price Out  ${joiners}[3][user_token]  ${50}
    Go Next Turn  ${added_one}[id]
    Move Bidding Date  ${False}
    Customer Price Out  ${joiners}[1][user_token]  ${300}
    Customer Price Out  ${joiners}[2][user_token]  ${280}
    Confirm One Bidding    ${added_one}[id]  ${joiners}[1][user_token]
    ${resp}  Req Get to Server  /bid/get_all_created  ${sc_admin_token}  biddings
    Should Be Equal  ${resp}[0][confirm_opt_name]  ${joiners}[1][name]
    Should Not Be Empty    ${resp}[0][customer_confirm_time]
Confirm Bidding When One Turn Finished
    [Teardown]  Bidding Reset
    ${result}  Prepare One Finish Bidding
    Confirm One Bidding    ${result}[0][id]  ${result}[1][user_token]
    ${resp}  Req Get to Server  /bid/get_all_created  ${sc_admin_token}  biddings
    Should Be Equal  ${resp}[0][confirm_opt_name]  ${result}[1][name]
    Should Not Be Empty    ${resp}[0][customer_confirm_time]


Bidding Msg Verify
    [Teardown]  Bidding Reset
    ${added_one}  Create A Bidding  ${test_stuff}  ${1}
    Add All Customer To Bidding Except First One  ${added_one}[id]
    WxMsg Catch
    WxMsg was recieved    ${joiners}[1][open_id]    竞价开始
    WxMsg was recieved    ${joiners}[2][open_id]    竞价开始
    WxMsg was recieved    ${joiners}[3][open_id]    竞价开始
    Move Bidding Date
    Customer Accept Bidding  ${joiners}[1][user_token]
    Customer Accept Bidding  ${joiners}[2][user_token]
    Customer Accept Bidding  ${joiners}[3][user_token]
    Move Bidding Date  ${False}
    Customer Price Out  ${joiners}[1][user_token]  ${100}
    Customer Price Out  ${joiners}[2][user_token]  ${200}
    Customer Price Out  ${joiners}[3][user_token]  ${50}
    WxMsg Catch
    WxMsg was recieved    ${joiners}[2][open_id]    中标
    WxMsg was recieved    opid1234    出价

Create Plan Based on Bidding
    [Teardown]  Run Keywords  Bidding Reset  AND  Plan Reset
    ${result}  Prepare One Finish Bidding
    ${creator}  Set Variable  ${result}[1]
    Confirm One Bidding    ${result}[0][id]  ${creator}[user_token]
    Create Bidding Plan  ${result}[0][id]  ${creator}[user_token]
    ${resp}  Search Plans Based on User    ${creator}[user_token]  ${False}
    ${focus_plan}  Set Variable  ${resp}[0]
    Should Be Equal    ${focus_plan}[unit_price]    ${result}[2]
    Should Not Be Empty    ${focus_plan}[bidding_item]
    Should Be True    ${focus_plan}[from_bidding]
    ${req}=    Create Dictionary    unit_price=${123}   plan_id=${focus_plan}[id]   comment=abc
    ${resp}=   Req to Server    /stuff/change_price_by_plan    ${sc_admin_token}    ${req}  ${True}

Create Plan Based on Bidding With Exception
    [Teardown]  Run Keywords  Bidding Reset  AND  Plan Reset
    ${result}  Prepare One Finish Bidding
    ${creator}  Set Variable  ${result}[1]
    Create Bidding Plan  ${result}[0][id]  ${creator}[user_token]  ${True}
    Confirm One Bidding    ${result}[0][id]  ${creator}[user_token]
    Create Bidding Plan  ${result}[0][id]  ${joiners}[3][user_token]  ${True}

Create Plan Based on Bidding Before Finish
    [Teardown]  Run Keywords  Bidding Reset  AND  Plan Reset
    ${added_one}  Create A Bidding  ${test_stuff}  ${1}
    Add All Customer To Bidding Except First One  ${added_one}[id]
    Create Bidding Plan  ${added_one}[id]  ${joiners}[2][user_token]  ${True}