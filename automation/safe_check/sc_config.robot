*** Settings ***
Resource  sc_opt.resource
Suite Setup  Prepare A Paied Plan
Suite Teardown  Cleanup Paied Plan

*** Test Cases ***
SC Require Config
    [Teardown]  SC Reset
    Fetch SC Req  ${test_stuff}[id]  s1  ${True}  ${True}  ${True}  ${0}
    Fetch SC Req  ${test_stuff}[id]  s2  ${True}  ${False}  ${False}  ${1}
    Fetch SC Req  ${test_stuff}[id]  s1  ${True}  ${False}  ${False}  ${1}
    Fetch SC Req  ${test_stuff}[id]  s3  ${False}  ${False}  ${True}  ${2}
    ${req}  Create Dictionary  stuff_id=${test_stuff}[id]
    ${resp}  Req Get to Server  /sc/get_req  ${sc_admin_token}  reqs  ${-1}  &{req}
    Length Should Be  ${resp}  3
    ${one}  Get SC Req  ${test_stuff}[id]  s2
    Del SC Req  ${one}[id]
    ${resp}  Req Get to Server  /sc/get_req  ${sc_admin_token}  reqs  ${-1}  &{req}
    Length Should Be  ${resp}  2


No SC Upload And Check In After SC Enabled
    [Teardown]  Run Keywords  Cancel Check In Plan  ${test_plan}  AND  SC Reset
    Enable Stuff SC  ${test_stuff}[id]
    Check In A Plan  ${test_plan}
    Cancel Check In Plan  ${test_plan}
    Fetch SC Req  ${test_stuff}[id]  s1  ${True}  ${True}  ${True}  ${0}
    ${driver}  Driver Online  ${test_plan}[driver][phone]  open_id_for_test  11100090909
    ${req}  Create Dictionary  open_id=${driver}[open_id]  plan_id=${test_plan}[id]
    Req to Server  /plan/check_in  none  ${req}  ${True}
    Disable Stuff SC  ${test_stuff}[id]
    Check In A Plan  ${test_plan}

Driver Upload SC When SC Content Is Empty
    [Setup]  Enable SC AND Add Some SC req
    [Teardown]  Run Keywords  Cancel Check In Plan  ${test_plan}  AND  SC Reset
    ${resp}  Get Driver And Sale Plan SC  ${test_plan}  ${False}
    Length Should Be  ${resp}  5
    FOR  ${itr}  IN  @{resp}
        Dictionary Should Not Contain Key  ${itr}  sc_content
    END
    FOR  ${itr}  IN  @{resp}
        Driver Upload SC Content  ${test_plan}  ${itr}[id]
    END
    ${resp}  Get Driver And Sale Plan SC  ${test_plan}  ${False}
    FOR  ${itr}  IN  @{resp}
        Dictionary Should Contain Key  ${itr}  sc_content
    END

Driver Update SC Before Passed
    [Setup]  Enable SC AND Add Some SC req
    [Teardown]  Run Keywords  Cancel Check In Plan  ${test_plan}  AND  SC Reset
    ${resp}  Get Driver And Sale Plan SC  ${test_plan}  ${False}
    ${last_one}  Set Variable
    FOR  ${itr}  IN  @{resp}
        Driver Upload SC Content  ${test_plan}  ${itr}[id]
        ${last_one}  Set Variable  ${itr}[id]
    END
    Driver Upload SC Content  ${test_plan}  ${last_one}  abcd
    ${cur_status}  Get Driver And Sale Plan SC  ${test_plan}  ${False}
    ${last_content}  Get From List  ${cur_status}  -1
    Should Be Equal As Strings  ${last_content}[sc_content][input]  abcd

Driver Delete SC Before Passed
    [Setup]  Enable SC AND Add Some SC req
    [Teardown]  Run Keywords  Cancel Check In Plan  ${test_plan}  AND  SC Reset
    ${resp}  Get Driver And Sale Plan SC  ${test_plan}  ${False}
    FOR  ${itr}  IN  @{resp}
        Driver Upload SC Content  ${test_plan}  ${itr}[id]
    END
    ${resp}  Get Driver And Sale Plan SC  ${test_plan}  ${False}
    ${mid_one}  Set Variable  ${resp}[2][sc_content][id]
    Driver Delete SC Content  ${test_plan}  ${mid_one}
    ${cur_status}  Get Driver And Sale Plan SC  ${test_plan}  ${False}
    Should Not Contain  ${cur_status}[0]  sc_content

Check Driver Upload SC
    [Setup]  Enable SC AND Add Some SC req
    [Teardown]  Run Keywords  Cancel Check In Plan  ${test_plan}  AND  SC Reset
    ${resp}  Get Driver And Sale Plan SC  ${test_plan}  ${False}
    Driver Upload SC Content  ${test_plan}  ${resp}[1][id]
    ${resp}  Get Driver And Sale Plan SC  ${test_plan}  ${False}
    ${index}  Set Variable  ${-1}
    FOR  ${itr}  IN  @{resp}
        IF  'sc_content' in ${itr}
            ${index}  Set Variable  ${itr}[sc_content][id]
            Exit For Loop
        END
    END
    Log  ${index}
    Should Not Be Equal As Integers  ${index}  ${-1}
    ${req}  Create Dictionary  content_id=${index}
    # Req to Server  /sc/check  ${sc_admin_token}  ${req}

*** Keywords ***
Enable SC AND Add Some SC req
    Enable Stuff SC  ${test_stuff}[id]
    Fetch SC Req  ${test_stuff}[id]  s1  ${True}  ${True}  ${True}  ${0}
    Fetch SC Req  ${test_stuff}[id]  s2  ${True}  ${False}  ${True}  ${1}
    Fetch SC Req  ${test_stuff}[id]  s3  ${True}  ${False}  ${False}  ${2}
    Fetch SC Req  ${test_stuff}[id]  s4  ${False}  ${True}  ${False}  ${1}
    Fetch SC Req  ${test_stuff}[id]  s5  ${True}  ${True}  ${False}  ${0}

Get Driver And Sale Plan SC
    [Arguments]  ${plan}  ${passed}
    ${resp_driver}  Driver Get SC Status  ${plan}  ${passed}
    ${resp_sale}  Get SC Status By Plan  ${plan}  ${passed}
    Lists Should Be Equal  ${resp_driver}  ${resp_sale}
    RETURN  ${resp_driver}
