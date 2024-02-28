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