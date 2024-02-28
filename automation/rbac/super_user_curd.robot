*** Settings ***
Resource  ../api_base.resource
Resource  ../database.resource
Resource  rbac_curd.resource

*** Test Cases ***
Single Add Company
    Clear Table  company
    ${add_req}  Create Dictionary  name=test_company
    Req to Server  /rbac/company_add  ABCD  ${add_req}
    @{cur_companys}  Get All Company
    ${found_ret}  Set Variable  False
    FOR  ${itr}  IN  @{cur_companys}
        ${itr_name}  Get From Dictionary  ${itr}  name
        IF  $itr_name == 'test_company'
            ${found_ret}  Set Variable  True
            Exit For Loop
        END
    END
    Should Be True  ${found_ret}
Lots of Company
    Clear Table  company
    FOR  ${itr}  IN RANGE  131
        ${add_req}  Create Dictionary  name=test_company_${itr}
        Req to Server  /rbac/company_add  ABCD  ${add_req}
    END
    @{cur_companys}  Get All Company
    ${found_ret}  Set Variable  True
    FOR  ${itr_index}  IN RANGE  131
        ${found_ret}  Set Variable  False
        FOR  ${itr}  IN  @{cur_companys}
            ${itr_name}  Get From Dictionary  ${itr}  name
            IF  $itr_name == 'test_company_${itr_index}'
                ${found_ret}  Set Variable  True
                Exit For Loop
            END
        END
        Should Be True  ${found_ret}
    END

