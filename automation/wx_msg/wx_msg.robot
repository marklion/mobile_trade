*** Settings ***
Resource  ../stuff/stuff_opt.resource
Resource  ../safe_check/sc_opt.resource
Suite Setup  Run Keywords  Prepare For Msg Test  AND  Init Wx Msg Config
Suite Teardown  Clean Up Msg Test

*** Variables ***
${mv}
${bv}
${dv}
${plan_status}  ps
${call_vehicle}  cv
${scale_msg}  sm
${bidding_status}  bs
${sc_status}  ss

*** Test Cases ***
Plan Create Msg
    [Teardown]  Plan Reset
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Msg Verify    opid1234    ${plan_status}

Plan Confirm Msg
    [Teardown]  Plan Reset
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Msg Verify    2233    ${plan_status}

Plan Deliver Msg
    [Teardown]  Plan Reset
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan    ${plan}
    Deliver A Plan  ${plan}  ${23}
    Msg Verify    2233    ${plan_status}

Call Vehicle Msg
    [Teardown]  Plan Reset
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan    ${plan}
    Check In A Plan    ${plan}
    Call A Plan    ${plan}
    Msg Verify  open_id_for_test  ${call_vehicle}

Ticket Msg
    [Teardown]  Plan Reset
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan    ${plan}
    Check In A Plan    ${plan}
    Call A Plan    ${plan}
    Deliver A Plan  ${plan}  ${23}
    WxMsg Catch
    WxMsg was recieved    open_id_for_test    ${scale_msg}
    WxMsg was recieved    2233    ${scale_msg}

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
    Msg Verify    opid1234    ${sc_status}
    Check Pass SC Status By Index  ${plan}  0
    Msg Verify    open_id_for_test   ${sc_status}
    Check Pass SC Status By Index  ${plan}  0  ${False}
    Msg Verify    open_id_for_test   ${sc_status}

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

Init Wx Msg Config
    ${req}  Create Dictionary  plan_status=${plan_status}  call_vehicle=${call_vehicle}  scale_msg=${scale_msg}  bidding_status=${bidding_status}  sc_status=${sc_status}
    Req to Server    /global/set_wx_msg_config    admin_token    ${req}