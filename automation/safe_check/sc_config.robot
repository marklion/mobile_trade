*** Settings ***
Resource  sc_opt.resource
Suite Setup  Prepare A Paied Plan
Suite Teardown  Cleanup Paied Plan

*** Test Cases ***
SC Require Config
    [Teardown]  SC Reset
    Fetch SC Req  ${test_stuff}[id]  s1  ${True}  ${True}  ${True}  ${0}
    Fetch SC Req  ${test_stuff}[id]  s2  ${True}  ${False}  ${False}  ${1}
    Fetch SC Req  ${test_stuff}[id]  s1  ${True}  ${False}  ${False}  ${1}
    Fetch SC Req  ${test_stuff}[id]  s3  ${False}  ${False}  ${True}  ${2}
    ${req}  Create Dictionary  stuff_id=${test_stuff}[id]
    ${resp}  Req Get to Server  /sc/get_req  ${sc_admin_token}  reqs  ${-1}  &{req}
    Length Should Be  ${resp}  3
    ${one}  Get SC Req  ${test_stuff}[id]  s2
    Del SC Req  ${one}[id]
    ${resp}  Req Get to Server  /sc/get_req  ${sc_admin_token}  reqs  ${-1}  &{req}
    Length Should Be  ${resp}  2


No SC Upload And Check In After SC Enabled
    [Teardown]  Run Keywords  Cancel Check In Plan  ${test_plan}  AND  SC Reset
    Enable Stuff SC  ${test_stuff}[id]
    Check In A Plan  ${test_plan}
    Cancel Check In Plan  ${test_plan}
    Fetch SC Req  ${test_stuff}[id]  s1  ${True}  ${True}  ${True}  ${0}
    Check In A Plan  ${test_plan}  ${True}
    Disable Stuff SC  ${test_stuff}[id]
    Check In A Plan  ${test_plan}

Driver Upload SC When SC Content Is Empty
    [Setup]  Enable SC AND Add Some SC req
    [Teardown]  Run Keywords  Cancel Check In Plan  ${test_plan}  AND  SC Reset
    ${resp}  Get Driver And Sale Plan SC  ${test_plan}  ${False}
    Length Should Be  ${resp}  5
    FOR  ${itr}  IN  @{resp}
        Dictionary Should Not Contain Key  ${itr}  sc_content
    END
    FOR  ${itr}  IN  @{resp}
        Driver Upload SC Content  ${test_plan}  ${itr}[id]
    END
    ${resp}  Get Driver And Sale Plan SC  ${test_plan}  ${False}
    FOR  ${itr}  IN  @{resp}
        Dictionary Should Contain Key  ${itr}  sc_content
    END

Driver Update SC Before Passed
    [Setup]  Enable SC AND Add Some SC req
    [Teardown]  Run Keywords  Cancel Check In Plan  ${test_plan}  AND  SC Reset
    ${resp}  Get Driver And Sale Plan SC  ${test_plan}  ${False}
    ${last_one}  Set Variable
    FOR  ${itr}  IN  @{resp}
        Driver Upload SC Content  ${test_plan}  ${itr}[id]
        ${last_one}  Set Variable  ${itr}[id]
    END
    Driver Upload SC Content  ${test_plan}  ${last_one}  abcd
    ${cur_status}  Get Driver And Sale Plan SC  ${test_plan}  ${False}
    ${last_content}  Get From List  ${cur_status}  -1
    Should Be Equal As Strings  ${last_content}[sc_content][input]  abcd

Driver Delete SC Before Passed
    [Setup]  Enable SC AND Add Some SC req
    [Teardown]  Run Keywords  Cancel Check In Plan  ${test_plan}  AND  SC Reset
    ${resp}  Get Driver And Sale Plan SC  ${test_plan}  ${False}
    FOR  ${itr}  IN  @{resp}
        Driver Upload SC Content  ${test_plan}  ${itr}[id]
    END
    ${resp}  Get Driver And Sale Plan SC  ${test_plan}  ${False}
    ${mid_one}  Set Variable  ${resp}[2][sc_content][id]
    Driver Delete SC Content  ${test_plan}  ${mid_one}
    ${cur_status}  Get Driver And Sale Plan SC  ${test_plan}  ${False}
    Should Not Contain  ${cur_status}[0]  sc_content

Check Driver Upload SC
    [Setup]  Enable SC AND Add Some SC req
    [Teardown]  Run Keywords  Cancel Check In Plan  ${test_plan}  AND  SC Reset
    ${resp}  Get Driver And Sale Plan SC  ${test_plan}  ${False}
    Driver Upload SC Content  ${test_plan}  ${resp}[1][id]
    ${resp}  Get Driver And Sale Plan SC  ${test_plan}  ${False}
    Check Pass SC Status By Index  ${test_plan}  0
    ${resp}  Get Driver And Sale Plan SC  ${test_plan}  ${False}
    Should Be True  ${resp}[-1][sc_content][passed]
    Check Pass SC Status By Index  ${test_plan}  0  ${False}
    ${resp}  Get Driver And Sale Plan SC  ${test_plan}  ${False}
    Should Not Be True  ${resp}[-1][sc_content][passed]
    Driver Upload SC Content  ${test_plan}  ${resp}[0][id]
    ${resp}  Get Driver And Sale Plan SC  ${test_plan}  ${False}
    Driver Upload SC Content  ${test_plan}  ${resp}[0][id]
    ${resp}  Get Driver And Sale Plan SC  ${test_plan}  ${False}
    Driver Upload SC Content  ${test_plan}  ${resp}[0][id]
    ${resp}  Get Driver And Sale Plan SC  ${test_plan}  ${False}
    Driver Upload SC Content  ${test_plan}  ${resp}[0][id]
    Check Pass SC Status By Index  ${test_plan}  0
    Check Pass SC Status By Index  ${test_plan}  0
    Check Pass SC Status By Index  ${test_plan}  0
    Check Pass SC Status By Index  ${test_plan}  0
    Check Pass SC Status By Index  ${test_plan}  0
    ${resp}  Get Driver And Sale Plan SC  ${test_plan}  ${True}
    FOR  ${itr}  IN  @{resp}
        Should Be True  ${itr}[sc_content][passed]
    END
    Check In A Plan  ${test_plan}
    Cancel Check In Plan  ${test_plan}
    Check Pass SC Status By Index  ${test_plan}  0  ${False}
    Check In A Plan  ${test_plan}  ${True}

SC Expired Before Check In
    [Setup]  Enable SC AND Add Some SC req
    [Teardown]  Run Keywords  Cancel Check In Plan  ${test_plan}  AND  SC Reset
    ${current_time}  Get Current Date  result_format=%Y-%m-%d %H:%M:%S
    ${next_time}  Add Time To Date  ${current_time}  1 day  result_format=%Y-%m-%d %H:%M:%S
    ${prev_time}  Subtract Time From Date    ${current_time}    1 day  result_format=%Y-%m-%d %H:%M:%S

    #司机获取安检需求
    ${resp}  Get Driver And Sale Plan SC  ${test_plan}  ${False}
    FOR  ${itr}  IN  @{resp}
        #上传证件并批准
        Driver Upload SC Content  ${test_plan}  ${itr}[id]  abc  def  ${next_time}
        Check Pass SC Status By Index  ${test_plan}  0
    END
    #可以正常排号
    Check In A Plan  ${test_plan}
    Cancel Check In Plan    ${test_plan}

    #从数据库把没有过期要求的安检内容的有效期改前
    ${resp}  Get Driver And Sale Plan SC  ${test_plan}  ${True}
    FOR  ${itr}  IN  @{resp}
        IF  ${itr}[need_expired] == ${False}
            Change SC Content Expired Date    ${itr}[sc_content][id]    ${prev_time}
            BREAK
        END
    END
    #可以正常排号
    Check In A Plan  ${test_plan}
    Cancel Check In Plan    ${test_plan}

    #从数据库把有过期要求的安检内容的有效期改前
    ${resp}  Get Driver And Sale Plan SC  ${test_plan}  ${True}
    FOR  ${itr}  IN  @{resp}
        IF  ${itr}[need_expired] == ${True}
            Change SC Content Expired Date    ${itr}[sc_content][id]    ${prev_time}
            BREAK
        END
    END
    #获取到的安检状态应该是不通过
    ${resp}  Get Driver And Sale Plan SC  ${test_plan}  ${False}
    #应该不可以排号
    Check In A Plan  ${test_plan}  ${True}


SC Archived After Plan Finish
    [Setup]  Enable SC AND Add Some SC req
    [Teardown]  SC Reset
    ${resp}  Get Driver And Sale Plan SC  ${test_plan}  ${False}
    FOR  ${itr}  IN  @{resp}
        Driver Upload SC Content  ${test_plan}  ${itr}[id]
    END
    Check Pass SC Status By Index  ${test_plan}  0
    Check Pass SC Status By Index  ${test_plan}  0
    Check Pass SC Status By Index  ${test_plan}  0
    Check Pass SC Status By Index  ${test_plan}  0
    Check Pass SC Status By Index  ${test_plan}  0
    ${sc_rec}  Get Driver And Sale Plan SC  ${test_plan}  ${True}
    Deliver A Plan  ${test_plan}  ${34}
    ${resp}  Get Plan By Id  ${test_plan}[id]
    Lists Should Be Equal  ${sc_rec}  ${resp}[sc_info]
    Check Pass SC Status By Index  ${test_plan}  0  ${False}
    ${sc_rec}  Get Driver And Sale Plan SC  ${test_plan}  ${False}
    ${resp}  Get Plan By Id  ${test_plan}[id]
    FOR  ${itr}  IN  @{resp}[sc_info]
        Should Be True  ${itr}[sc_content][passed]
    END

FC Table Config
    [Teardown]  FC Reset
    Add FC Table    t1
    Add FC Table    t2
    Add FC Table    t3
    Add FC Table    t2
    ${fc_table}  Search FC Table    t2
    Should Not Be Empty    ${fc_table}
    Del FC Table    ${fc_table}[id]
    ${fc_table}  Search FC Table    t3
    Should Not Be Empty    ${fc_table}
    ${fc_table}  Search FC Table    t2
    Should Be Empty    ${fc_table}

FC Table Config Item
    [Setup]  Add FC Table    t1
    [Teardown]  FC Reset
    Add Item to FC Table    t1    i1
    Add Item to FC Table    t1    i2
    Add Item to FC Table    t1    i3
    Add Item to FC Table    t1    i2
    ${fc_item}  Search FC Item    t1    i2
    Should Not Be Empty    ${fc_item}
    Del Item from FC Table    t1    i2
    ${fc_item}  Search FC Item    t1    i3
    Should Not Be Empty    ${fc_item}
    ${fc_item}  Search FC Item    t1    i2
    Should Be Empty    ${fc_item}

FC Table Config Role
    [Setup]  Add FC Table    t1
    [Teardown]  FC Reset
    Set Role to FC Table    t1    fcr1
    ${fc_table}  Search FC Table    t1
    ${role}  Get Role By Name    ${sc_admin_token}    fcr1
    Should Be Equal    ${fc_table}[rbac_role][id]    ${role}[id]
    Set Role to FC Table    t1    fcr2
    ${fc_table}  Search FC Table    t1
    Should Not Be Equal    ${fc_table}[rbac_role][id]    ${role}[id]

FC Excute
    [Setup]  Prepare FC Configured
    [Teardown]  FC Reset
    Set FC Item Passed  ${test_plan}    t1    i11
    Set FC Item Passed  ${test_plan}    t2    i21
    ${fc_cr}  Search FC Result    ${test_plan}    t1    i11
    Should Not Be Empty    ${fc_cr}[pass_time]
    ${fc_cr}  Search FC Result    ${test_plan}    t2    i21
    Should Not Be Empty    ${fc_cr}[pass_time]
    ${fc_cr}  Search FC Result    ${test_plan}    t2    i22
    Should Not Contain    ${fc_cr}    pass_time

    Set FC Plan Table Finish    ${test_plan}    t2
    ${fc_plan_table}  Search FC Plan Table    ${test_plan}    t1
    Should Not Contain    ${fc_plan_table}[fc_plan_table]  finish_time
    ${fc_plan_table}  Search FC Plan Table    ${test_plan}    t2
    Should Not Be Empty    ${fc_plan_table}[fc_plan_table][finish_time]

FC Block Plan
    [Setup]  Prepare FC Configured
    [Teardown]  FC Reset
    Check In A Plan    ${test_plan}
    Set Requirement to FC    t1  require_before_call=${True}
    Call A Plan    ${test_plan}  ${True}
    Set FC Item Passed    ${test_plan}    t1    i11
    Set FC Item Passed    ${test_plan}    t1    i12
    Set FC Plan Table Finish    ${test_plan}    t1
    Call A Plan    ${test_plan}  ${True}
    Set FC Item Passed    ${test_plan}    t1    i13
    Call A Plan    ${test_plan}
    Confirm Vehicle    ${test_plan}
    Confirm Vehicle    ${test_plan}  is_confirm=${False}
    Set Requirement to FC    t1  require_before_call=${True}  require_before_confirm=${True}
    Confirm Vehicle    ${test_plan}
    Confirm Vehicle    ${test_plan}  is_confirm=${False}
    Set Requirement to FC    t2  require_before_call=${True}  require_before_confirm=${True}
    Confirm Vehicle    ${test_plan}  expect_fail=${True}
    Set FC Item Passed    ${test_plan}    t2    i21
    Set FC Item Passed    ${test_plan}    t2    i22
    Set FC Item Passed    ${test_plan}    t2    i23
    Set FC Item Passed    ${test_plan}    t2    i24
    Set FC Plan Table Finish    ${test_plan}    t2
    Confirm Vehicle    ${test_plan}
    Confirm Vehicle    ${test_plan}  is_confirm=${False}
    Cancel Check In Plan    ${test_plan}


FC Excute Failure
    [Setup]  Prepare FC Configured
    [Teardown]  FC Reset
    Set Role to FC Table    t1    fcr1
    Set FC Item Passed    ${test_plan}  t1  i11  expect_failure=${True}
    Set FC Plan Table Finish    ${test_plan}    t1  expect_failure=${True}

*** Keywords ***
Enable SC AND Add Some SC req
    Enable Stuff SC  ${test_stuff}[id]
    Fetch SC Req  ${test_stuff}[id]  s1  ${True}  ${True}  ${True}  ${0}
    Fetch SC Req  ${test_stuff}[id]  s2  ${True}  ${False}  ${True}  ${1}
    Fetch SC Req  ${test_stuff}[id]  s3  ${True}  ${False}  ${False}  ${2}
    Fetch SC Req  ${test_stuff}[id]  s4  ${False}  ${True}  ${False}  ${1}
    Fetch SC Req  ${test_stuff}[id]  s5  ${True}  ${True}  ${False}  ${0}

Get Driver And Sale Plan SC
    [Arguments]  ${plan}  ${passed}
    ${resp_driver}  Driver Get SC Status  ${plan}  ${passed}
    ${resp_sale}  Get SC Status By Plan  ${plan}  ${passed}
    Lists Should Be Equal  ${resp_driver}  ${resp_sale}
    RETURN  ${resp_driver}

Prepare FC Configured
    Add FC Table    t1
    Add Item to FC Table    t1    i11
    Add Item to FC Table    t1    i12
    Add Item to FC Table    t1    i13
    Add FC Table    t2
    Add Item to FC Table    t2    i21
    Add Item to FC Table    t2    i22
    Add Item to FC Table    t2    i23
    Add Item to FC Table    t2    i24
    Set Role to FC Table    t1    公司管理员
    Set Role to FC Table    t2    公司管理员