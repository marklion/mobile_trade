*** Settings ***
Resource  sc_opt.resource
Suite Setup  Prepare Lots of Company And SC
Suite Teardown  Cleanup Prepare Above

*** Variables ***
${total_customer}  ${3}
${total_sale}  ${2}
${plan_count_per_stuff}  ${3}
@{customer_user}
@{customer_company}
@{sale_admin}

*** Test Cases ***
Diff Vehicle Plan
    @{all_driver}  Create List
    ${index}  Set Variable  ${0}
    FOR  ${itr}  IN  @{customer_user}
        @{stuffs_found}  Req Get to Server  /customer/get_stuff_on_sale  ${itr}  stuff
        FOR  ${sub_itr}  IN  @{stuffs_found}
            FOR  ${pc}  IN RANGE  ${plan_count_per_stuff}
                ${mv}  Search Main Vehicle by Index  ${index}${sub_itr}[id]_${pc}  ${itr}
                ${bv}  Search behind Vehicle by Index  ${index}${sub_itr}[id]_${pc}  ${itr}
                ${dv}  Search Driver by Index  ${index}${sub_itr}[id]_${pc}  ${itr}
                Append To List  ${all_driver}  ${dv}[phone]
                Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]  ${itr}  2024-09-09  tm  tda  tuf  ${sub_itr}[id]
            END
        END
        ${index}  Set Variable  ${index+1}
    END
    FOR  ${itr}  IN  @{sale_admin}
        ${resp}  Search Plans Based on User  ${itr}
        FOR  ${sub_itr}  IN  @{resp}
            Confirm A Plan  ${sub_itr}  ${itr}
            Manual Pay A Plan  ${sub_itr}  ${itr}
        END
    END
    FOR  ${itr}  IN  @{all_driver}
        ${resp}  Driver Online  ${itr}  ${itr}_open_id  ${itr}_id_card
        ${req}  Create Dictionary  open_id=${resp}[open_id]
        ${resp}  Req Get to Server  /global/driver_get_order  none  plans  -1  &{req}
        ${plan}  Set Variable  ${resp}[0]
        ${plan_id}  Get From Dictionary  ${plan}  id
        IF  $plan_id % 4 == 0
            ${resp}  Driver Get SC Status  ${plan}
            FOR  ${sub_itr}  IN  @{resp}
                Driver Upload SC Content  ${plan}  ${sub_itr}[id]  abcd  ddee
            END
        ELSE IF  $plan_id % 4 == 1
            ${resp}  Driver Get SC Status  ${plan}
            FOR  ${sub_itr}  IN  @{resp}
                Driver Upload SC Content  ${plan}  ${sub_itr}[id]  abcd  ddee
                Exit For Loop
            END
        ELSE IF  $plan_id % 4 == 2
            ${resp}  Driver Get SC Status  ${plan}
            FOR  ${sub_itr}  IN  @{resp}
                Driver Upload SC Content  ${plan}  ${sub_itr}[id]  abcd  ddee
            END
        END
    END
    FOR  ${itr}  IN  @{sale_admin}
        ${plans}  Search Plans Based on User  ${itr}  ${True}  ${2}
        FOR  ${sub_itr}  IN  @{plans}
            ${plan_id}  Get From Dictionary  ${sub_itr}  id
            IF  $plan_id % 4 == 0 or $plan_id % 4 == 1
                ${sc_req}  Get SC Status By Plan  ${sub_itr}  ${None}  ${itr}
                FOR  ${sc_c}  IN  @{sc_req}
                    Check Pass SC Status By Index  ${sub_itr}  ${0}  ${True}  ${itr}
                END
            ELSE IF  $plan_id % 4 == 2
                ${sc_req}  Get SC Status By Plan  ${sub_itr}  ${None}  ${itr}
                FOR  ${sc_c}  IN  @{sc_req}
                    Check Pass SC Status By Index  ${sub_itr}  ${0}  ${True}  ${itr}
                    Exit For Loop
                END
            END
        END
    END
    FOR  ${itr}  IN  @{all_driver}
        ${resp}  Driver Online  ${itr}  ${itr}_open_id  ${itr}_id_card
        ${req}  Create Dictionary  open_id=${resp}[open_id]
        ${resp}  Req Get to Server  /global/driver_get_order  none  plans  -1  &{req}
        ${plan}  Set Variable  ${resp}[0]
        ${plan_id}  Get From Dictionary  ${plan}  id
        ${resp}  Driver Get SC Status  ${plan}
        ${sc_len}  Get Length  ${resp}
        IF  $plan_id % 4 == 0 or $sc_len == 0
            Check In A Plan  ${plan}
        ELSE
            Check In A Plan  ${plan}  ${True}
        END
    END

*** Keywords ***
Prepare Lots of Company And SC
    FOR  ${index}  IN RANGE  0  ${total_customer}
        ${company}  Create One Company  cust_${index}
        ${user}  New User Login  1234_${company}[id]  ${company}[name]  opid_${index}  cust_name_${index}
        Append To List  ${customer_user}  ${user}
        Append To List  ${customer_company}  ${company}
    END
    FOR  ${index}  IN RANGE  0  ${total_sale}
        ${sale_company}  Create One Company  sale_${index}
        Company Set Script  ${sale_company}[id]  normal
        ${sc_admin_token}  Login As Admin Of Company  ${sale_company}[id]  9999_${index}  sc_admin_${index}
        Append To List  ${sale_admin}  ${sc_admin_token}
        Add Module To Company  ${sale_company}[id]  stuff
        Add Module To Company  ${sale_company}[id]  cash
        Add Module To Company  ${sale_company}[id]  scale
        Add Module To Company  ${sale_company}[id]  sc
        Add Module To Company  ${sale_company}[id]  sale_management
        Add Module To User  ${sc_admin_token}  9999_${index}  stuff
        Add Module To User  ${sc_admin_token}  9999_${index}  cash
        Add Module To User  ${sc_admin_token}  9999_${index}  scale
        Add Module To User  ${sc_admin_token}  9999_${index}  sc
        Add Module To User  ${sc_admin_token}  9999_${index}  sale_management
        FOR  ${j}  IN RANGE  0  ${index+2}
            ${stuff}  Add A Stuff To Sale  wl_${j}  wl_comment_${j}  ${22}  ${sc_admin_token}
            Change Stuff Price  ${stuff}[id]  ${j+1212}  ${False}  test_change  ${sc_admin_token}
            IF  ${j} % 2 == 0
                Enable Stuff SC  ${stuff}[id]  ${sc_admin_token}
                FOR  ${isc}  IN RANGE  10
                    Fetch SC Req  ${stuff}[id]  sc_req_${stuff}[name]_${isc}  ${True}  ${False}  ${True}  ${1}  ${sc_admin_token}
                END
            END
        END
        FOR  ${itr}  IN  @{customer_company}
            Add A Company As Customer  ${itr}[id]  ${sc_admin_token}
            Authorize User to Contract  ${itr}[name]  1234_${itr}[id]  ${sc_admin_token}
            FOR  ${j}  IN RANGE  0  ${index+2}
                Add A Stuff To Contract  wl_${j}  ${itr}[name]  ${sc_admin_token}
            END
        END
    END



Cleanup Prepare Above
    SC Reset
    Plan Reset
    Clean Up Sale and Buy
