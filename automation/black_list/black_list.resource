*** Settings ***
Resource  ../database.resource
Resource  ../api_base.resource
Resource  ../stuff/stuff_opt.resource
Library  String

*** Keywords ***
Cleanup Blacklist
    Clear Table  blacklist
Add To Blacklist
    [Arguments]  ${ids}  ${type}  ${reason} 
    ${req}  Create Dictionary  ids=${ids}  type=${type}  reason=${reason}
    ${resp}  Req to Server  /stuff/add_to_blacklist  ${sc_admin_token}  ${req}
    Should Be True  ${resp}[result]

Remove From Blacklist
    [Arguments]  ${ids}  ${type}
    ${req}  Create Dictionary  ids=${ids}  type=${type}
    ${resp}  Req to Server  /stuff/remove_from_blacklist  ${sc_admin_token}  ${req}
    Should Be True  ${resp}[result]
Get Blacklist
    ${resp}  Req Get to Server  /stuff/get_blacklist  ${sc_admin_token}  blacklist  pageNo=1
    RETURN  ${resp}

