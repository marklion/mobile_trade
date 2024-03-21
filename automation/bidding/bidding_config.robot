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
# Join A Bidding And Check
