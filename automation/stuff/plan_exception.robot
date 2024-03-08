*** Settings ***
Resource  stuff_opt.resource
Suite Setup  Prepare Sale and Buy
Suite Teardown  Clean Up Sale and Buy

*** Test Cases ***
Update Plan Before Confirm
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${mv_new}  Search Main Vehicle by Index  121
    ${bv}  Search behind Vehicle by Index  0
    ${bv_new}  Search behind Vehicle by Index  333
    ${dv}  Search Driver by Index  0
    ${dv_new}  Search Driver by Index  1
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    ${update_info}  Create Dictionary  driver_id=${dv_new}[id]  main_vehicle_id=${mv_new}[id]  comment=new_comment
    Update A Plan  ${plan}[id]  &{update_info}
    ${resp}  Search Plans Based on User  ${sc_admin_token}
    Should Be Equal As Strings  ${resp}[0][driver][phone]  ${dv_new}[phone]
    Should Be Equal As Strings  ${resp}[0][main_vehicle][plate]  ${mv_new}[plate]
    Should Be Equal As Strings  ${resp}[0][behind_vehicle][plate]  ${bv}[plate]
    Should Be Equal As Strings  ${resp}[0][comment]  new_comment
    Should Be Equal As Strings  ${resp}[0][use_for]  测试用途
    ${update_info}  Create Dictionary  behind_vehicle_id=${bv_new}[id]  plan_time=2021-10-10 11:12:11  use_for=abcd  drop_address=def
    Update A Plan  ${plan}[id]  &{update_info}
    ${resp}  Search Plans Based on User  ${sc_admin_token}
    Should Be Equal As Strings  ${resp}[0][plan_time]  2021-10-10 11:12:11
    Should Be Equal As Strings  ${resp}[0][use_for]  abcd
    Should Be Equal As Strings  ${resp}[0][drop_address]  def
    Should Be Equal As Strings  ${resp}[0][behind_vehicle][plate]  ${bv_new}[plate]
    Should Be Equal As Strings  ${resp}[0][driver][phone]  ${dv_new}[phone]
    Should Be Equal As Strings  ${resp}[0][main_vehicle][plate]  ${mv_new}[plate]
Update Plan After Confirm
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${bv_new}  Search behind Vehicle by Index  333
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    ${update_info}  Create Dictionary  behind_vehicle_id=${bv_new}[id]  plan_time=2021-10-10 11:12:11  use_for=abcd  drop_address=def
    Set To Dictionary  ${update_info}  plan_id=${plan}[id]
    Req to Server  /plan/update  ${bc1_user_token}  ${update_info}  ${True}