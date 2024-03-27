*** Settings ***
Resource  bidding_opt.resource
Suite Setup  Prepare Four Costomers And One Sale
Suite Teardown  Cleanup Joiner

*** Test Cases ***
Bidding Create And Check
    [Teardown]  Bidding Reset
    ${added_one}  Create A Bidding  ${test_stuff}
    Add All Customer To Bidding Except First One  ${added_one}[id]
    ${added_one}  Req Get to Server  /bidding/get_all_created  ${sc_admin_token}  biddings
    ${added_one}  Set Variable  ${added_one}[0]
    Should Be Equal As Integers  ${added_one}[status]  0
    FOR  ${index}  IN RANGE  1  ${total_joiner}
        ${itr}  Set Variable  ${joiners}[${index}]
        ${resp}  Req Get to Server  /bidding/get_all_joined  ${itr}[user_token]  items
        Should Be Equal As Strings  ${resp}[0][accept]  ${False}
        Should Be Equal As Strings  ${resp}[0][price]  ${0}
        Should Be Equal As Integers  ${added_one}[id]  ${resp}[0][bidding_turn][bidding_config][id]
        Should Be Equal As Integers  ${added_one}[bidding_turns][0][id]  ${resp}[0][bidding_turn][id]
    END
    ${resp}  Req Get to Server  /bidding/get_all_joined  ${joiners}[0][user_token]  items
    Length Should Be  ${resp}  0
    FOR  ${itr}  IN RANGE   82
        ${added_one}  Create A Bidding  ${test_stuff}
    END
    ${resp}  Req Get to Server  /bidding/get_all_created  ${sc_admin_token}  biddings
    Length Should Be  ${resp}  83
Accept And Bid
    [Teardown]  Bidding Reset
    ${added_one}  Create A Bidding  ${test_stuff}
    Add All Customer To Bidding Except First One  ${added_one}[id]
    ${resp}  Req Get to Server  /bidding/get_all_joined  ${joiners}[1][user_token]  items
    ${req}  Create Dictionary  item_id=${resp}[0][id]
    Req to Server  /bidding/accept  ${joiners}[1][user_token]  ${req}  ${True}
    Move Bidding Date
    Customer Accept Bidding  ${joiners}[1][user_token]
    ${resp}  Req Get to Server  /bidding/get_all_joined  ${joiners}[1][user_token]  items
    ${req}  Create Dictionary  item_id=${resp}[0][id]
    Req to Server  /bidding/accept  ${joiners}[2][user_token]  ${req}  ${True}
    Customer Accept Bidding  ${joiners}[2][user_token]
    ${resp}  Req Get to Server  /bidding/get_all_created  ${sc_admin_token}  biddings
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
    ${resp}  Req Get to Server  /bidding/get_all_joined  ${joiners}[1][user_token]  items
    ${req}  Create Dictionary  item_id=${resp}[0][id]  price=${100}
    Req to Server  /bidding/price  ${joiners}[2][user_token]  ${req}  ${True}
    ${resp}  Req Get to Server  /bidding/get_all_joined  ${joiners}[1][user_token]  items
    ${req}  Create Dictionary  item_id=${resp}[0][id]  price=${100}
    Req to Server  /bidding/price  ${joiners}[1][user_token]  ${req}  ${True}

    Move Bidding Date  ${False}
    Customer Price Out  ${joiners}[1][user_token]  ${100}
    ${resp}  Req Get to Server  /bidding/get_all_created  ${sc_admin_token}  biddings
    Should Be Equal As Numbers  ${resp}[0][bidding_turns][0][bidding_items][0][price]  100
    Customer Price Out  ${joiners}[2][user_token]  ${200}
    ${resp}  Req Get to Server  /bidding/get_all_created  ${sc_admin_token}  biddings
    Should Be Equal As Numbers  ${resp}[0][bidding_turns][0][bidding_items][0][price]  200
    Customer Price Out  ${joiners}[3][user_token]  ${50}
    ${resp}  Req Get to Server  /bidding/get_all_created  ${sc_admin_token}  biddings
    Should Be Equal As Numbers  ${resp}[0][bidding_turns][0][bidding_items][0][price]  200
    Should Be True  ${resp}[0][bidding_turns][0][finish]

    ${resp}  Req Get to Server  /bidding/get_all_joined  ${joiners}[1][user_token]  items
    ${req}  Create Dictionary  item_id=${resp}[0][id]  price=${100}
    Req to Server  /bidding/price  ${joiners}[1][user_token]  ${req}  ${True}
    ${resp}  Req Get to Server  /bidding/get_all_joined  ${joiners}[4][user_token]  items
    ${req}  Create Dictionary  item_id=${resp}[0][id]  price=${100}
    Req to Server  /bidding/price  ${joiners}[4][user_token]  ${req}  ${True}

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
    ${resp}  Req Get to Server  /bidding/get_all_created  ${sc_admin_token}  biddings
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
    ${resp}  Req Get to Server  /bidding/get_all_created  ${sc_admin_token}  biddings
    Should Be Equal As Numbers  ${resp}[0][bidding_turns][0][bidding_items][0][price]  300
    Should Be True  ${resp}[0][bidding_turns][0][finish]
    Should Be Equal As Integers  ${resp}[0][status]  1