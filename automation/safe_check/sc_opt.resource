*** Settings ***
Resource  ../database.resource
Resource  ../api_base.resource
Resource  ../stuff/stuff_opt.resource

*** Variables ***
${test_plan}

*** Keywords ***
Prepare A Paied Plan
    Prepare Sale and Buy
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan  ${plan}
    Set Suite Variable  ${test_plan}  ${plan}
Cleanup Paied Plan
    Plan Reset
    Clean Up Sale and Buy
Enable Stuff SC
    [Arguments]  ${stuff_id}
    ${req}  Create Dictionary  stuff_id=${stuff_id}  need_sc=${True}
    Req to Server  /stuff/sc_config  ${sc_admin_token}  ${req}
Disable Stuff SC
    [Arguments]  ${stuff_id}
    ${req}  Create Dictionary  stuff_id=${stuff_id}  need_sc=${False}
    Req to Server  /stuff/sc_config  ${sc_admin_token}  ${req}
Fetch SC Req
    [Arguments]  ${stuff_id}  ${name}  ${need_attach}  ${need_input}  ${need_expired}  ${belong_type}
    ${req}  Create Dictionary  stuff_id=${stuff_id}  name=${name}  need_attach=${need_attach}  need_input=${need_input}  need_expired=${need_expired}  belong_type=${belong_type}
    Req to Server  /sc/fetch_req  ${sc_admin_token}  ${req}
    ${added_one}  Get SC Req  ${stuff_id}  ${name}
    Should Be Equal  ${added_one}[need_attach]  ${need_attach}
    Should Be Equal  ${added_one}[need_input]  ${need_input}
    Should Be Equal  ${added_one}[need_expired]  ${need_expired}
    Should Be Equal  ${added_one}[belong_type]  ${belong_type}
Get SC Req
    [Arguments]  ${stuff_id}  ${name}
    ${req}  Create Dictionary  stuff_id=${test_stuff}[id]
    ${resp}  Req Get to Server  /sc/get_req  ${sc_admin_token}  reqs  ${-1}  &{req}
    FOR  ${itr}  IN  @{resp}
        ${itr_name}  Get From Dictionary  ${itr}  name
        IF  $itr_name == $name
            RETURN  ${itr}
        END

    END
Del SC Req
    [Arguments]  ${req_id}
    ${req}  Create Dictionary  req_id=${req_id}
    Req to Server  /sc/del_req  ${sc_admin_token}  ${req}
Driver Get SC Status
    [Arguments]  ${plan}  ${expect_pass}=${None}
    ${driver}  Driver Online  ${plan}[driver][phone]  open_id_for_test  11100090909
    ${req}  Create Dictionary  open_id=${driver}[open_id]  plan_id=${plan}[id]

    IF  ${expect_pass} != ${None}
        ${resp}  Req to Server  /sc/get_driver_req  none  ${req}
        Should Be Equal  ${resp}[passed]  ${expect_pass}
    END
    ${resp}  Req Get to Server  /sc/get_driver_req  none  reqs  ${-1}  &{req}
    RETURN  ${resp}
Driver Upload SC Content
    [Arguments]  ${plan}  ${req_id}  ${input}=isc  ${attachment}=asc  ${expired_time}=2029-12-12
    ${driver}  Driver Online  ${plan}[driver][phone]  open_id_for_test  11100090909
    ${req}  Create Dictionary  plan_id=${plan}[id]  open_id=${driver}[open_id]  req_id=${req_id}  input=${input}  attachment=${attachment}  expired_time=${expired_time}
    Req to Server  /sc/upload_sc_content  none  ${req}
Driver Delete SC Content
    [Arguments]  ${plan}  ${content_id}
    ${driver}  Driver Online  ${plan}[driver][phone]  open_id_for_test  11100090909
    ${req}  Create Dictionary  content_id=${content_id}  open_id=${driver}[open_id]
    Req to Server  /sc/delete_content  none  ${req}
Get SC Status By Plan
    [Arguments]  ${plan}  ${expect_pass}=${None}
    ${req}  Create Dictionary  plan_id=${plan}[id]
    IF  ${expect_pass} != ${None}
        ${resp}  Req to Server  /sc/plan_status  ${sc_admin_token}  ${req}
        Should Be Equal  ${resp}[passed]  ${expect_pass}
    END
    ${resp}  Req Get to Server  /sc/plan_status  ${sc_admin_token}  reqs  ${-1}  &{req}
    RETURN  ${resp}
Check Pass SC Status By Index
    [Arguments]  ${plan}  ${index}  ${pass}=${True}
    ${resp}  Get SC Status By Plan  ${plan}
    @{contents}  Create List
    FOR  ${itr}  IN  @{resp}
        IF  'sc_content' in ${itr}
            Append To List  ${contents}  ${itr}[sc_content][id]
        END
    END
    ${req}  Create Dictionary  content_id=${contents}[${index}]
    IF  ${pass} == ${False}
        Set To Dictionary  ${req}  comment=cancel
    END
    Req to Server  /sc/check  ${sc_admin_token}  ${req}

