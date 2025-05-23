*** Settings ***
Resource  bidding_opt.resource
Suite Setup  Run Keywords  Prepare Four Costomers And One Sale  AND  Set Bidding Verify  ${False}
Suite Teardown  Run Keywords  Cleanup Joiner  AND  Set Bidding Verify  ${True}

*** Test Cases ***
Cash not Enough to Accept
    [Teardown]  Bidding Reset
    ${added_one}  Create A Bidding  ${test_stuff}  ${1}  ${109}
    Add All Customer To Bidding Except First One  ${added_one}[id]
    Move Bidding Date
    ${resp}  Req Get to Server  /customer/bidding_search  ${joiners}[1][user_token]  items
    ${req}  Create Dictionary  item_id=${resp}[0][id]
    Req to Server  /customer/bidding_accept  ${joiners}[1][user_token]  ${req}  ${True}
    Charge To A Company  ${joiners}[1][company][id]  ${109}
    Customer Accept Bidding  ${joiners}[1][user_token]
Cancle Bidding Turn
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
    ${resp}  Req Get to Server  /bid/get_all_created  ${sc_admin_token}  biddings
    Should Not Be True  ${resp}[0][bidding_turns][0][finish]
    ${req}  Create Dictionary  bc_id=${resp}[0][id]
    Req to Server  /bid/stop  ${sc_admin_token}  ${req}
    ${resp}  Req Get to Server  /bid/get_all_created  ${sc_admin_token}  biddings
    Should Be True  ${resp}[0][bidding_turns][0][finish]
    Should Be Equal As Integers  ${resp}[0][status]  2
    ${resp}  Req Get to Server  /customer/bidding_search  ${joiners}[3][user_token]  items
    ${req}  Create Dictionary  item_id=${resp}[0][id]  price=${12}  v_code=${default_price_v_code}
    Req to Server  /customer/bidding_price  ${joiners}[3][user_token]  ${req}  ${True}

Confirm Bidding While Lose
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
    Confirm One Bidding    ${added_one}[id]  ${joiners}[2][user_token]  ${True}

Confirm Bidding While Not Finished
    [Teardown]  Bidding Reset
    ${added_one}  Create A Bidding  ${test_stuff}  ${2}
    Add All Customer To Bidding Except First One  ${added_one}[id]
    Move Bidding Date
    Customer Accept Bidding  ${joiners}[1][user_token]
    Customer Accept Bidding  ${joiners}[2][user_token]
    Customer Accept Bidding  ${joiners}[3][user_token]
    Move Bidding Date  ${False}
    Customer Price Out  ${joiners}[1][user_token]  ${199}
    Confirm One Bidding    ${added_one}[id]  ${joiners}[2][user_token]  ${True}
    Customer Price Out  ${joiners}[2][user_token]  ${200}
    Customer Price Out  ${joiners}[3][user_token]  ${50}
    Confirm One Bidding    ${added_one}[id]  ${joiners}[2][user_token]  ${True}
    Go Next Turn  ${added_one}[id]
    Move Bidding Date  ${False}
    Customer Price Out  ${joiners}[1][user_token]  ${300}
    Confirm One Bidding    ${added_one}[id]  ${joiners}[1][user_token]  ${True}

Export Bidding While Not Finished
    [Teardown]  Bidding Reset
    ${added_one}  Create A Bidding  ${test_stuff}  ${1}
    Add All Customer To Bidding Except First One  ${added_one}[id]
    Move Bidding Date
    Customer Accept Bidding  ${joiners}[1][user_token]
    Customer Accept Bidding  ${joiners}[2][user_token]
    Customer Accept Bidding  ${joiners}[3][user_token]
    Move Bidding Date  ${False}
    Customer Price Out  ${joiners}[1][user_token]  ${199}
    Export Bidding    ${added_one}[id]  exception=${True}
    Customer Price Out  ${joiners}[2][user_token]  ${198}
    Customer Price Out  ${joiners}[3][user_token]  ${197}
    Export Bidding    ${added_one}[id]

Bidding Price With Wrong Verify Code
    [Teardown]  Run Keywords  Bidding Reset  AND  Set Bidding Verify  ${False}
    Set Bidding Verify  ${True}
    ${added_one}  Create A Bidding  ${test_stuff}  ${2}
    Add All Customer To Bidding Except First One  ${added_one}[id]
    Move Bidding Date
    Customer Accept Bidding  ${joiners}[1][user_token]
    Customer Accept Bidding  ${joiners}[2][user_token]
    Customer Accept Bidding  ${joiners}[3][user_token]
    Move Bidding Date  ${False}
    ${resp}  Req Get to Server  /customer/bidding_search  ${joiners}[1][user_token]  items
    ${req}  Create Dictionary  item_id=${resp}[0][id]  price=${121}  v_code=${default_price_v_code}
    Req to Server  /customer/bidding_price  ${joiners}[1][user_token]  ${req}  ${True}
