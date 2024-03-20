*** Settings ***
Resource  bidding_opt.resource
Suite Setup  Prepare Four Costomers And One Sale
Suite Teardown  Cleanup Joiner

*** Test Cases ***
Bidding Create And Check
    [Teardown]  Bidding Reset
    ${added_one}  Create A Bidding  ${test_stuff}
    ${resp}  Req Get to Server  /bidding/get_all_created  ${sc_admin_token}  biddings
    Should Be Equal As Integers  ${resp}[0][status]  ${0}
    Dictionaries Should Be Equal  ${added_one}  ${resp}[0]
    ${req}  Create Dictionary  stuff_id=${test_stuff}[id]
    ${found_contracts}  Req Get to Server  /contract/get_all_sale  ${sc_admin_token}  contracts  ${-1}  &{req}
    @{joiner_ids}  Create List
    FOR  ${itr}  IN  @{found_contracts}
        ${au_users}  Get From Dictionary  ${itr}  rbac_users
        FOR  ${sub_itr}  IN  @{au_users}
            ${tmp}  Create Dictionary  id=${sub_itr}[id]
            Append To List  ${joiner_ids}  ${tmp}
        END
    END
    ${req}  Create Dictionary  bc_id=${added_one}[id]  joiner_ids=${joiner_ids}  end_time=2025-01-10
    ${added_one}  Req to Server  /bidding/add_turn  ${sc_admin_token}  ${req}

    FOR  ${itr}  IN  @{joiners}
        ${resp}  Req Get to Server  /bidding/get_all_joined  ${itr}[user_token]  items
        Should Be Equal As Strings  ${resp}[0][accept]  ${False}
        Should Be Equal As Strings  ${resp}[0][price]  ${0}
        Should Be Equal As Integers  ${added_one}[id]  ${resp}[0][bidding_turn][id]
    END


    FOR  ${itr}  IN RANGE   82
        ${added_one}  Create A Bidding  ${test_stuff}
    END
    ${resp}  Req Get to Server  /bidding/get_all_created  ${sc_admin_token}  biddings
    Length Should Be  ${resp}  83
# Join A Bidding And Check
