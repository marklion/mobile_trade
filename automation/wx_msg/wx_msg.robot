*** Settings ***
Resource  ../stuff/stuff_opt.resource
Resource  ../safe_check/sc_opt.resource
Suite Setup  Prepare For Msg Test
Suite Teardown  Clean Up Msg Test

*** Variables ***
${mv}
${bv}
${dv}

*** Test Cases ***
Plan Create Msg
    [Teardown]  Plan Reset
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Msg Verify    opid1234    qn42DMtvKzNMpOw1wz0DHTqAOPO9PiYDBzI3vz6Laxg

Plan Confirm Msg
    [Teardown]  Plan Reset
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Msg Verify    2233    qn42DMtvKzNMpOw1wz0DHTqAOPO9PiYDBzI3vz6Laxg

Plan Deliver Msg
    [Teardown]  Plan Reset
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan    ${plan}
    Deliver A Plan  ${plan}  ${23}
    Msg Verify    2233    qn42DMtvKzNMpOw1wz0DHTqAOPO9PiYDBzI3vz6Laxg

Call Vehicle Msg
    [Teardown]  Plan Reset
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan    ${plan}
    Check In A Plan    ${plan}
    Call A Plan    ${plan}
    Msg Verify  open_id_for_test  foumgWCOdHirOuI8mi28M1XNtyRDqfU9n4pLsX5AMxM

Ticket Msg
    [Teardown]  Plan Reset
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan    ${plan}
    Check In A Plan    ${plan}
    Call A Plan    ${plan}
    Deliver A Plan  ${plan}  ${23}
    WxMsg Catch
    WxMsg was recieved    open_id_for_test    86yW1daS1NNjQzkrogRe_cc4dqGNVWI-iTcOJX0K6Rk
    WxMsg was recieved    2233    86yW1daS1NNjQzkrogRe_cc4dqGNVWI-iTcOJX0K6Rk

SC Check Msg
    [Setup]  Enable Stuff SC  ${test_stuff}[id]
    [Teardown]  Plan Reset
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan    ${plan}
    ${resp}  Driver Get SC Status  ${plan}
    FOR  ${itr}  IN  @{resp}
        Driver Upload SC Content  ${plan}  ${itr}[id]
    END
    Msg Verify    opid1234    2TU7PD2S7qJ1PaJBsodFe5chMQ_ncO8rZeoq_He3hi8
    Check Pass SC Status By Index  ${plan}  0
    Msg Verify    open_id_for_test   2TU7PD2S7qJ1PaJBsodFe5chMQ_ncO8rZeoq_He3hi8

*** Keywords ***
Prepare For Msg Test
    Prepare Sale and Buy
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    Set Suite Variable    ${mv}
    Set Suite Variable    ${bv}
    Set Suite Variable    ${dv}
    Disable Stuff SC    ${test_stuff}[id]
    Fetch SC Req  ${test_stuff}[id]  s1  ${True}  ${True}  ${True}  ${0}

Clean Up Msg Test
    SC Reset
    Clean Up Sale and Buy

Msg Verify
    [Arguments]  ${open_id}  ${msg_id}
    WxMsg Catch
    WxMsg was recieved    ${open_id}    ${msg_id}