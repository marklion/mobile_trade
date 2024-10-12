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
    [Arguments]  ${stuff_id}  ${token}=${sc_admin_token}
    ${req}  Create Dictionary  stuff_id=${stuff_id}  need_sc=${True}
    Req to Server  /stuff/sc_config  ${token}  ${req}
Disable Stuff SC
    [Arguments]  ${stuff_id}
    ${req}  Create Dictionary  stuff_id=${stuff_id}  need_sc=${False}
    Req to Server  /stuff/sc_config  ${sc_admin_token}  ${req}
Fetch SC Req
    [Arguments]  ${stuff_id}  ${name}  ${need_attach}  ${need_input}  ${need_expired}  ${belong_type}  ${token}=${sc_admin_token}
    ${req}  Create Dictionary  stuff_id=${stuff_id}  name=${name}  need_attach=${need_attach}  need_input=${need_input}  need_expired=${need_expired}  belong_type=${belong_type}
    Req to Server  /sc/fetch_req  ${token}  ${req}
    ${added_one}  Get SC Req  ${stuff_id}  ${name}  ${token}
    Should Be Equal  ${added_one}[need_attach]  ${need_attach}
    Should Be Equal  ${added_one}[need_input]  ${need_input}
    Should Be Equal  ${added_one}[need_expired]  ${need_expired}
    Should Be Equal  ${added_one}[belong_type]  ${belong_type}
Get SC Req
    [Arguments]  ${stuff_id}  ${name}  ${token}=${sc_admin_token}
    ${req}  Create Dictionary  stuff_id=${stuff_id}
    ${resp}  Req Get to Server  /sc/get_req  ${token}  reqs  ${-1}  &{req}
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
    ${driver}  Driver Online  ${plan}[driver][phone]  open_id_${plan}[driver][phone]  11100090909
    ${req}  Create Dictionary  open_id=${driver}[open_id]  plan_id=${plan}[id]

    IF  ${expect_pass} != ${None}
        ${resp}  Req to Server  /global/driver_get_sc_req  none  ${req}
        Should Be Equal  ${resp}[passed]  ${expect_pass}
    END
    ${resp}  Req Get to Server  /global/driver_get_sc_req  none  reqs  ${-1}  &{req}
    RETURN  ${resp}
Driver Upload SC Content
    [Arguments]  ${plan}  ${req_id}  ${input}=isc  ${attachment}=asc  ${expired_time}=2029-12-12
    ${driver}  Driver Online  ${plan}[driver][phone]  open_id_for_test  11100090909
    ${req}  Create Dictionary  plan_id=${plan}[id]  open_id=${driver}[open_id]  req_id=${req_id}  input=${input}  attachment=${attachment}  expired_time=${expired_time}
    Req to Server  /global/driver_upload_sc_content  none  ${req}
Driver Delete SC Content
    [Arguments]  ${plan}  ${content_id}
    ${driver}  Driver Online  ${plan}[driver][phone]  open_id_for_test  11100090909
    ${req}  Create Dictionary  content_id=${content_id}  open_id=${driver}[open_id]
    Req to Server  /global/driver_delete_sc_content  none  ${req}
Get SC Status By Plan
    [Arguments]  ${plan}  ${expect_pass}=${None}  ${token}=${sc_admin_token}
    ${req}  Create Dictionary  plan_id=${plan}[id]
    IF  ${expect_pass} != ${None}
        ${resp}  Req to Server  /sc/plan_status  ${token}  ${req}
        Should Be Equal  ${resp}[passed]  ${expect_pass}
    END
    ${resp}  Req Get to Server  /sc/plan_status  ${token}  reqs  ${-1}  &{req}
    RETURN  ${resp}
Check Pass SC Status By Index
    [Arguments]  ${plan}  ${index}  ${pass}=${True}  ${token}=${sc_admin_token}
    ${resp}  Get SC Status By Plan  ${plan}  ${None}  ${token}
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
    Req to Server  /sc/check  ${token}  ${req}

Add FC Table
    [Arguments]  ${table_name}  ${token}=${sc_admin_token}  ${stuff_id}=${test_stuff}[id]
    ${req}  Create Dictionary  name=${table_name}  stuff_id=${stuff_id}
    Req to Server    /sc/add_fc_table  ${token}  ${req}

Del FC Table
    [Arguments]  ${table_id}  ${token}=${sc_admin_token}
    ${req}  Create Dictionary  id=${table_id}
    Req to Server    /sc/del_fc_table  ${token}  ${req}

Search FC Table
    [Arguments]  ${table_name}  ${token}=${sc_admin_token}  ${stuff_id}=${test_stuff}[id]
    ${req}  Create Dictionary  stuff_id=${stuff_id}
    ${resp}  Req Get to Server  /sc/get_all_fc_table  ${token}  fc_table  ${-1}  &{req}
    ${found_one}  Set Variable  ${EMPTY}
    FOR    ${element}    IN    @{resp}
        ${itr_name}  Get From Dictionary  ${element}  name  ${None}
        IF  $table_name == $itr_name
            ${found_one}  Set Variable  ${element}
            Exit For Loop
        END
    END
    RETURN  ${found_one}

Add Item to FC Table
    [Arguments]  ${table_name}  ${item_name}  ${token}=${sc_admin_token}  ${stuff_id}=${test_stuff}[id]
    ${table}  Search FC Table    ${table_name}
    ${req}  Create Dictionary  table_id=${table}[id]  name=${item_name}
    Req to Server    /sc/add_item2fc_table  ${token}  ${req}

Search FC Item
    [Arguments]  ${table_name}  ${item_name}  ${token}=${sc_admin_token}  ${stuff_id}=${test_stuff}[id]
    ${table}  Search FC Table    ${table_name}
    ${found_one}  Set Variable  ${EMPTY}
    FOR    ${element}    IN    @{table}[field_check_items]
        ${itr_name}  Get From Dictionary  ${element}  name  ${None}
        IF  $itr_name == $item_name
            ${found_one}  Set Variable  ${element}
            Exit For Loop
        END
    END
    RETURN  ${found_one}

Del Item from FC Table
    [Arguments]  ${table_name}  ${item_name}  ${token}=${sc_admin_token}  ${stuff_id}=${test_stuff}[id]
    ${fc_item}  Search FC Item    ${table_name}  ${item_name}
    ${req}  Create Dictionary  id=${fc_item}[id]
    Req to Server    /sc/del_fc_item  ${token}  ${req}

Set Role to FC Table
    [Arguments]  ${table_name}  ${role_name}  ${token}=${sc_admin_token}  ${stuff_id}=${test_stuff}[id]
    Add Role    ${token}    ${role_name}
    ${role}  Get Role By Name    ${token}    ${role_name}
    ${table}  Search FC Table    ${table_name}
    ${req}  Create Dictionary  role_id=${role}[id]  table_id=${table}[id]
    Req to Server    /rbac/add_fc_table2role    ${token}    ${req}
