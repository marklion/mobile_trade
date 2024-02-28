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

Clear Non-Admin User
    Connect To Database Using Custom Params  sqlite3  database="${DB_PATH}"
    Execute Sql String  delete from rbac_user where phone != '18911992582';
    Execute Sql String  delete from rbac_user_role where rbacUserId not in (select id from rbac_user where phone = '18911992582');
    Disconnect From All Databases