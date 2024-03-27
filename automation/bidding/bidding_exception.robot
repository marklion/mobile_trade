*** Settings ***
Resource  bidding_opt.resource
Suite Setup  Prepare Four Costomers And One Sale
Suite Teardown  Cleanup Joiner

*** Test Cases ***
Cash not Enough to Accept
    [Teardown]  Bidding Reset
    ${added_one}  Create A Bidding  ${test_stuff}  ${1}  ${109}
    Add All Customer To Bidding Except First One  ${added_one}[id]
    Move Bidding Date
    ${resp}  Req Get to Server  /bidding/get_all_joined  ${joiners}[1][user_token]  items
    ${req}  Create Dictionary  item_id=${resp}[0][id]
    Req to Server  /bidding/accept  ${joiners}[1][user_token]  ${req}  ${True}
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
    ${resp}  Req Get to Server  /bidding/get_all_created  ${sc_admin_token}  biddings
    Should Not Be True  ${resp}[0][bidding_turns][0][finish]
    ${req}  Create Dictionary  bc_id=${resp}[0][id]
    Req to Server  /bidding/stop  ${sc_admin_token}  ${req}
    ${resp}  Req Get to Server  /bidding/get_all_created  ${sc_admin_token}  biddings
    Should Be True  ${resp}[0][bidding_turns][0][finish]
    Should Be Equal As Integers  ${resp}[0][status]  2
    ${resp}  Req Get to Server  /bidding/get_all_joined  ${joiners}[3][user_token]  items
    ${req}  Create Dictionary  item_id=${resp}[0][id]  price=${12}
    Req to Server  /bidding/price  ${joiners}[3][user_token]  ${req}  ${True}

