*** Settings ***
Resource  ../stuff/stuff_opt.resource
Resource  ../group/group.resource
Library  DateTime
Library  Collections

*** Keywords ***
Prepare Approval Environment
    Prepare Sale and Buy
    ${self}  Get Self Info  ${sc_admin_token}
    Convert To Group By Super Admin  ${sale_company}[id]  ${self}[id]
    ${cfg_req}  Create Dictionary  verify_pay_by_cash=${True}
    Req to Server  /stuff/set_verify_pay_config  ${sc_admin_token}  ${cfg_req}
    Approval Reset

Cleanup Approval Environment
    Clean Up Sale and Buy
    Approval Reset

Seed Approval E2E Plans
    [Documentation]    一条已关闭可调价计划 + 6 条已确认待验款计划（不同 plan_time）；审批项先全关以便走通造数。Suite 变量：approval_closed_plan_id、approval_pay_plan_id 及 _b/_c/_d/_e/_f。
    ${off1}  Create Dictionary  key=closed_order_price  enabled=${False}  approver_mode=default  auditer=
    ${off2}  Create Dictionary  key=manual_verify_pay  enabled=${False}  approver_mode=default  auditer=
    ${z}  Create List  ${off1}  ${off2}
    Set Approval Projects  ${z}
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${closed}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${closed}
    Manual Pay A Plan  ${closed}  ${sc_admin_token}  ${True}  ${False}
    Deliver A Plan  ${closed}  ${20}
    ${sw}  Create Dictionary  change_finished_order_price_switch=${True}
    Req to Server  /stuff/set_change_finished_order_price_switch  ${sc_admin_token}  ${sw}
    ${cg}  Get Plan By Id  ${closed}[id]
    Should Be Equal As Integers  ${cg}[status]  ${3}
    Set Suite Variable  ${approval_closed_plan_id}  ${closed}[id]
    @{pay_dates}  Create List  2090-03-01  2090-03-02  2090-03-03  2090-03-04  2090-03-05  2090-03-06
    @{pay_ids}  Create List
    FOR  ${d}  IN  @{pay_dates}
        ${pl}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]  plan_time=${d}
        Confirm A Plan  ${pl}
        ${pg}  Get Plan By Id  ${pl}[id]
        Should Be Equal As Integers  ${pg}[status]  ${1}
        Append To List  ${pay_ids}  ${pl}[id]
    END
    ${id_a}  Get From List  ${pay_ids}  ${0}
    ${id_b}  Get From List  ${pay_ids}  ${1}
    ${id_c}  Get From List  ${pay_ids}  ${2}
    ${id_d}  Get From List  ${pay_ids}  ${3}
    ${id_e}  Get From List  ${pay_ids}  ${4}
    ${id_f}  Get From List  ${pay_ids}  ${5}
    Set Suite Variable  ${approval_pay_plan_id}  ${id_a}
    Set Suite Variable  ${approval_pay_plan_b_id}  ${id_b}
    Set Suite Variable  ${approval_pay_plan_c_id}  ${id_c}
    Set Suite Variable  ${approval_pay_plan_d_id}  ${id_d}
    Set Suite Variable  ${approval_pay_plan_e_id}  ${id_e}
    Set Suite Variable  ${approval_pay_plan_f_id}  ${id_f}

Assert Plan Unit Price
    [Arguments]  ${plan_id}  ${expect_unit_price}
    ${p}  Get Plan By Id  ${plan_id}
    Should Not Be Empty  ${p}
    Should Be Equal As Numbers  ${p}[unit_price]  ${expect_unit_price}

Assert Sale Plan Status And Arrears
    [Arguments]  ${plan_id}  ${expect_status}  ${expect_arrears}
    ${p}  Get Plan By Id  ${plan_id}
    Should Not Be Empty  ${p}
    Should Be Equal As Integers  ${p}[status]  ${expect_status}
    Should Be Equal As Numbers  ${p}[arrears]  ${expect_arrears}

Set Approval Projects
    [Arguments]  ${projects}  ${token}=${sc_admin_token}
    ${req}  Create Dictionary  projects=${projects}
    Req to Server  /approval/set_approval_projects  ${token}  ${req}

Get Approval Projects
    [Arguments]  ${token}=${sc_admin_token}
    ${req}  Create Dictionary
    ${resp}  Req to Server  /approval/get_approval_projects  ${token}  ${req}
    RETURN  ${resp}

Get Approval Records
    [Arguments]  ${token}=${sc_admin_token}  ${status}=${None}
    ${req}  Create Dictionary  status=${status}
    ${records}  Req Get to Server  /approval/get_audit4req  ${token}  records  ${-1}  &{req}
    RETURN  ${records}

Assert Approval Progress For Record In List
    [Documentation]    在 get_audit4req 返回的列表中按 id 找到记录，断言 progress（提审人/有权限用户可见的审批进度文案）
    [Arguments]  ${records}  ${record_id}  ${expect_progress}
    ${want}  Convert To Integer  ${record_id}
    FOR  ${r}  IN  @{records}
        ${rid}  Get From Dictionary  ${r}  id
        ${rid_i}  Convert To Integer  ${rid}
        IF  $rid_i == $want
            ${prog}  Get From Dictionary  ${r}  progress
            Should Be Equal  ${prog}  ${expect_progress}
            ${sub}  Get From Dictionary  ${r}  submiter
            Should Not Be Empty  ${sub}
            RETURN
        END
    END
    Fail  审批列表中未找到记录 id=${record_id}

Approve Record
    [Arguments]  ${record_id}  ${token}=${sc_admin_token}
    ${req}  Create Dictionary  id=${record_id}  is_approve=${True}
    Req to Server  /approval/audit_req  ${token}  ${req}

Reject Record
    [Arguments]  ${record_id}  ${token}=${sc_admin_token}
    ${req}  Create Dictionary  id=${record_id}  is_approve=${False}
    Req to Server  /approval/audit_req  ${token}  ${req}

Trigger Closed Order Price Approval
    [Arguments]  ${token}=${sc_admin_token}  ${approval_auditer}=${EMPTY}  ${unit_price}=${66.88}  ${plan_id}=${EMPTY}
    ${target_plan}  Set Variable If  '${plan_id}' == '${EMPTY}'  ${approval_closed_plan_id}  ${plan_id}
    ${plan_id_str}  Convert To String  ${target_plan}
    ${up}  Convert To Number  ${unit_price}
    ${req}  Create Dictionary  unit_price=${up}  plan_id=${plan_id_str}  comment=自动化调价审批触发
    IF  '${approval_auditer}' != '${EMPTY}'
        Set To Dictionary  ${req}  approval_auditer=${approval_auditer}
    END
    Req to Server  /stuff/change_price_by_plan  ${token}  ${req}  ${False}  ${False}  ${False}

Trigger Manual Verify Pay Approval
    [Arguments]  ${token}=${sc_admin_token}  ${approval_auditer}=${EMPTY}  ${plan_id}=${EMPTY}
    ${target_plan}  Set Variable If  '${plan_id}' == '${EMPTY}'  ${approval_pay_plan_id}  ${plan_id}
    ${plan_id_num}  Convert To Integer  ${target_plan}
    ${req}  Create Dictionary  plan_id=${plan_id_num}
    IF  '${approval_auditer}' != '${EMPTY}'
        Set To Dictionary  ${req}  approval_auditer=${approval_auditer}
    END
    Req to Server  /cash/order_sale_pay  ${token}  ${req}  ${False}  ${False}  ${False}
