*** Settings ***
Resource  ../database.resource
Resource  ../api_base.resource
Resource  ../stuff/stuff_opt.resource
Library  String

*** Keywords ***
Cleanup Blacklist
    Clear Table  blacklist
Add To Blacklist
    [Arguments]  ${ids}  ${type}  ${reason}  ${token}=${sc_admin_token}
    ${req}  Create Dictionary  ids=${ids}  type=${type}  reason=${reason}
    ${resp}  Req to Server  /stuff/add_to_blacklist  ${token}  ${req}
    Should Be True  ${resp}[result]
Remove From Blacklist
    [Arguments]  ${ids}    ${token}=${sc_admin_token}
    ${req}  Create Dictionary  ids=${ids}
    ${resp}  Req to Server  /stuff/remove_from_blacklist  ${token}  ${req}
    Should Be True  ${resp}[result]
Get Blacklist
    [Arguments]  ${token}=${sc_admin_token}
    ${resp}  Req Get to Server  /stuff/get_blacklist  ${token}  blacklist  pageNo=1
    RETURN  ${resp}

