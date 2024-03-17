*** Settings ***
Library  DatabaseLibrary

*** Variables ***
${DB_PATH}  build/mt.db

*** Keywords ***
Clear Table
    [Arguments]  ${table}
    Connect To Database Using Custom Params  sqlite3  database="${DB_PATH}"
    Delete All Rows From Table  ${table}
    Disconnect From All Databases

RBAC reset
    Connect To Database Using Custom Params  sqlite3  database="${DB_PATH}"
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
    Connect To Database Using Custom Params  sqlite3  database="${DB_PATH}"
    Execute Sql String  update company set script = '${script_path}' where id = ${company_id};
    Disconnect From All Databases

SC Reset
    Clear Table  sc_content
    Clear Table  sc_req
