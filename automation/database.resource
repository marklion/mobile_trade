*** Settings ***
Library  DatabaseLibrary
Resource  var.resource
Library  OperatingSystem
Library  DateTime
Library  custom_library.py
Library  String
Library  Collections

*** Variables ***
${WX_API_RECORD_FILE}  /database/wx_api_log.txt
${DB_PATH}  ../build/mt.db
@{WX_MSG_CATCHED}

*** Keywords ***
Get DB Path
    ${real_db_path}  Set Variable  ${DB_PATH}
    IF  $server_db != ''
        ${real_db_path}  Set Variable  ${server_db}
    END
    RETURN  ${real_db_path}
Clear Table
    [Arguments]  ${table}
    ${db_p}  Get DB Path
    Connect To Database Using Custom Params  sqlite3  database="${db_p}"
    Delete All Rows From Table  ${table}
    Disconnect From All Databases

RBAC reset
    ${db_p}  Get DB Path
    Connect To Database Using Custom Params  sqlite3  database="${db_p}"
    Execute Sql String  delete from rbac_user where phone != '18911992582';
    Execute Sql String  delete from rbac_user_role where rbacUserId not in (select id from rbac_user where phone = '18911992582');
    Execute Sql String  delete from rbac_role where companyId is not null;
    Execute Sql String  delete from rbac_role_module where rbacRoleId not in (select id from rbac_role);
    Disconnect From All Databases

Company Reset
    Clear Table  company_module
    Clear Table  company

Stuff Reset
    Clear Table  stuff

Contract Reset
    Clear Table  contract
    Clear Table  contract_stuff
    Clear Table  balance_history
    Clear Table  user_contract

Plan Reset
    Clear Table  plan
    Clear Table  plan_history

Company Set Script
    [Arguments]  ${company_id}  ${script_path}
    ${db_p}  Get DB Path
    Connect To Database Using Custom Params  sqlite3  database="${db_p}"
    Execute Sql String  update company set script = '${script_path}' where id = ${company_id};
    Disconnect From All Databases

SC Reset
    Clear Table  sc_content
    Clear Table  sc_req

Bidding Reset
    Clear Table  bidding_config
    Clear Table  bidding_turn
    Clear Table  bidding_item

Change Bidding Begin Time
    [Arguments]  ${turn_id}  ${begin_time}
    ${db_p}  Get DB Path
    Connect To Database Using Custom Params  sqlite3  database="${db_p}"
    Execute Sql String  update bidding_turn set begin_time = '${begin_time}' where id = ${turn_id};
    Disconnect From All Databases

Change SC Content Expired Date
    [Arguments]  ${sc_id}  ${expired_date}
    ${db_p}  Get DB Path
    Connect To Database Using Custom Params  sqlite3  database="${db_p}"
    Execute Sql String  update sc_content set expired_time = '${expired_date}' where id = ${sc_id};
    Disconnect From All Databases

Update User OpenId
    [Arguments]  ${phone}  ${open_id}
    ${db_p}  Get DB Path
    Connect To Database Using Custom Params  sqlite3  database="${db_p}"
    Execute Sql String  update rbac_user set open_id = '${open_id}' where phone = '${phone}';
    Disconnect From All Databases

Exam Reset
    Clear Table  option_answer
    Clear Table  question
    Clear Table  exam_paper
    Clear Table  exam
    Clear Table  exam_answer

WxMsg Catch
    Sleep    2s
    ${records}  Get File  ${WX_API_RECORD_FILE}
    @{lines}  Split String    ${records}  \n
    ${time_begin}  Get Current Date  increment=-4seconds  result_format=%Y-%m-%d %H:%M:%S
    ${lines_after_filter}  filter_lines_by_time  ${lines}  ${time_begin}
    Log    ${lines_after_filter}
    ${WX_MSG_CATCHED}  Create List
    Append To List    ${WX_MSG_CATCHED}  @{lines_after_filter}
    Set Suite Variable  ${WX_MSG_CATCHED}
WxMsg was recieved
    [Arguments]  ${open_id}  ${msg_id}
    ${found}  Set Variable  ${False}
    Log  ${open_id}
    Log  ${msg_id}
    FOR    ${element}    IN    @{WX_MSG_CATCHED}
        IF  $open_id in $element and $msg_id in $element
            ${found}  Set Variable  ${True}
            Exit For Loop
        END
    END
    Should Be True    ${found}
