*** Settings ***
Resource  ../stuff/stuff_opt.resource

*** Variables ***
${total_joiner}  4
@{joiners}

*** Keywords ***
Prepare Four Costomers And One Sale
    FOR  ${index}  IN RANGE  ${total_joiner}
        ${company}  Create One Company  jc_${index}
        ${user}  New User Login  p${index}  j${index}  o${index}  n${index}
        ${tmp}  Create Dictionary  user_token=${user}  company=${company}  user_phone=p${index}
        Append To List  ${joiners}  ${tmp}
    END
    ${sale_company}  Create One Company  sale
    Company Set Script  ${sale_company}[id]  normal
    ${sc_admin_token}  Login As Admin Of Company  ${sale_company}[id]  1234  sc_admin
    Add Module To Company  ${sale_company}[id]  stuff
    Add Module To Company  ${sale_company}[id]  plan
    Add Module To Company  ${sale_company}[id]  cash
    Add Module To Company  ${sale_company}[id]  scale
    Add Module To Company  ${sale_company}[id]  sc
    Add Module To Company  ${sale_company}[id]  bid
    Add Module To User  ${sc_admin_token}  1234  stuff
    Add Module To User  ${sc_admin_token}  1234  plan
    Add Module To User  ${sc_admin_token}  1234  cash
    Add Module To User  ${sc_admin_token}  1234  scale
    Add Module To User  ${sc_admin_token}  1234  sc
    Add Module To User  ${sc_admin_token}  1234  bid
    Set Suite Variable  ${sc_admin_token}
    ${test_stuff}  Add A Stuff To Sale  lng  lng_comment
    Set Suite Variable  ${test_stuff}
    FOR  ${itr}  IN  @{joiners}
        Add A Stuff To Sale  lng  lng_comment
        Add A Company As Customer  ${itr}[company][id]
        Add A Stuff To Contract  lng  ${itr}[company][name]
        Set Suite Variable  ${test_stuff}
        Authorize User to Contract  ${itr}[company][name]  ${itr}[user_phone]
    END

Cleanup Joiner
    Stuff Reset
    Contract Reset
    Clean Up Companies And Users

Create A Bidding
    [Arguments]  ${stuff}  ${begin_time}=2024-02-13 10:11:11  ${total_turn}=${2}  ${pay_first}=${0}
    ${req}  Create Dictionary  stuff_id=${stuff}[id]  total=${50}
    ...    comment=abcd  begin_time=${begin_time}
    ...    min=${10}  max=${1000}  total_turn=${total_turn}  pay_first=${pay_first}
    ${resp}  Req to Server  /bidding/create  ${sc_admin_token}  ${req}
    RETURN  ${resp}