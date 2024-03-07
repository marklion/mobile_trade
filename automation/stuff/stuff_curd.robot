*** Settings ***
Resource  stuff_opt.resource

Suite Setup  Prepare Companies And Users
Suite Teardown  Clean Up Companies And Users

*** Test Cases ***
Stuff For Sold Operation
    [Teardown]  Stuff Reset
    Add A Stuff To Sale  st1  ${23}  asdfa
    Add A Stuff To Sale  st2  ${223}  aaaaaaa
    Add A Stuff To Sale  st1  ${23}  asdasdfasdf
    @{stuffs_found}  Req Get to Server  /stuff/get_all  ${sc_admin_token}  stuff
    Length Should Be  ${stuffs_found}  2
    Should Be Equal As Strings  ${stuffs_found[0]}[name]  st1
    Should Be Equal As Strings  ${stuffs_found[0]}[comment]  asdasdfasdf
    Should Be Equal As Strings  ${stuffs_found[1]}[name]  st2
    Del A Stuff From Sale  ${stuffs_found[1]}[id]
    @{stuffs_found}  Req Get to Server  /stuff/get_all  ${sc_admin_token}  stuff
    Length Should Be  ${stuffs_found}  1
    Should Be Equal As Strings  ${stuffs_found[0]}[name]  st1

Contract Maintain
    [Teardown]  Contract Reset
    Add A Company As Customer  ${buy_company1}[id]
    Add A Company As Customer  ${buy_company2}[id]
    ${req}  Create Dictionary
    ${found_contracts}  Req Get to Server  /contract/get_all_buy  ${bc1_user_token}  contracts
    Length Should Be  ${found_contracts}  1
    ${found_contracts}  Req Get to Server  /contract/get_all_sale  ${sc_admin_token}  contracts
    Length Should Be  ${found_contracts}  2
    Del A Customer Contract  ${found_contracts[0]}[id]
    ${found_contracts}  Req Get to Server  /contract/get_all_sale  ${sc_admin_token}  contracts
    Length Should Be  ${found_contracts}  1
    ${found_contracts}  Req Get to Server  /contract/get_all_buy  ${bc1_user_token}  contracts
    Length Should Be  ${found_contracts}  0
    ${found_contracts}  Req Get to Server  /contract/get_all_buy  ${bc2_user_token}  contracts
    Length Should Be  ${found_contracts}  1

Stuff via Contract Maintain
    [Teardown]  Run Keywords  Contract Reset  AND  Stuff Reset
    [Setup]  Run Keywords  Add A Company As Customer  ${buy_company1}[id]
    ...    AND  Add A Company As Customer  ${buy_company2}[id]
    ...    AND  Add A Stuff to Sale  st1  ${112}  abcdddd
    Add A Stuff To Contract  st1  bc1
    Add A Stuff To Contract  st1  bc2
    @{stuffs_found}  Req Get to Server  /stuff/get_stuff_on_sale  ${bc1_user_token}  stuff
    Length Should Be  ${stuffs_found}  1
    Should Be Equal As Numbers  ${stuffs_found[0]}[price]  112
    @{stuffs_found}  Req Get to Server  /stuff/get_stuff_on_sale  ${bc2_user_token}  stuff
    Length Should Be  ${stuffs_found}  1
    Should Be Equal As Numbers  ${stuffs_found[0]}[price]  112
    Del A Stuff From Contract  st1  bc1
    @{stuffs_found}  Req Get to Server  /stuff/get_stuff_on_sale  ${bc1_user_token}  stuff
    Length Should Be  ${stuffs_found}  1
    Should Be Equal As Numbers  ${stuffs_found[0]}[price]  -1

Contract Charge And Check
    [Teardown]  Run Keywords  Contract Reset  AND  Stuff Reset
    [Setup]  Run Keywords  Add A Company As Customer  ${buy_company1}[id]
    ...    AND  Add A Company As Customer  ${buy_company2}[id]
    ${contract_id}  Charge To A Company  ${buy_company1}[id]  ${1200}  abcd
    ${found_contracts}  Req Get to Server  /contract/get_all_buy  ${bc1_user_token}  contracts
    Should Be Equal As Numbers  ${found_contracts[0]}[balance]  ${1200}
    ${found_contracts}  Req Get to Server  /contract/get_all_sale  ${sc_admin_token}  contracts
    FOR  ${itr}  IN  @{found_contracts}
        ${cust_name}  Get From Dictionary  ${itr}[buy_company]  name
        IF  $cust_name == 'bc1'
            Should Be Equal As Numbers  ${itr}[balance]  1200
            Exit For Loop
        END
    END
    ${req}  Create Dictionary  contract_id=${contract_id}
    ${resp}  Req Get to Server  /contract/get_self_history  ${bc1_user_token}  histories  ${-1}  &{req}
    Should Be Equal As Numbers  ${resp}[0][cash_increased]  1200
    Should Be Equal As Strings  ${resp}[0][comment]  abcd
    ${req}  Create Dictionary  contract_id=${contract_id}
    ${resp}  Req Get to Server  /contract/get_company_history  ${sc_admin_token}  histories  ${-1}  &{req}
    Should Be Equal As Numbers  ${resp}[0][cash_increased]  1200
    Should Be Equal As Strings  ${resp}[0][comment]  abcd