*** Settings ***
Resource  stuff_opt.resource
Suite Setup  Prepare Sale and Buy
Suite Teardown  Clean Up Sale and Buy

*** Test Cases ***
Update Plan While Created
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
    Check New Status And History  ${plan}  0  改为  def
Cancel While Created
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Cancel A Plan  ${plan}
    Check New Status And History  ${plan}  3  取消
    ${plan}  Create A Order  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Cancel A Order  ${plan}
    Check New Status And History  ${plan}  3  取消
Close While Created
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Close A Plan  ${plan}
    Check New Status And History  ${plan}  3  关闭
    ${plan}  Create A Order  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Close A Order  ${plan}
    Check New Status And History  ${plan}  3  关闭
Disabled Action While Created
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Pay Failed  ${plan}
    Rollback Failed  ${plan}
    Enter Failed  ${plan}
    Deliver Failed  ${plan}
    Check In Failed  ${plan}  ${dv}[phone]
    Cancel Check In Failed  ${plan}
    ${plan}  Create A Order  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Order Rollback Failed  ${plan}
    Enter Failed  ${plan}
    Check In Failed  ${plan}  ${dv}[phone]
    Cancel Check In Failed  ${plan}

Rollback Plan While Confirmed
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${bv_new}  Search behind Vehicle by Index  333
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Rollback Plan  ${plan}
    Check New Status And History  ${plan}  0  回退  确认
    ${update_info}  Create Dictionary  comment=new_comment
    Update A Plan  ${plan}[id]  &{update_info}
    ${resp}  Search Plans Based on User  ${sc_admin_token}
    Should Be Equal As Strings  ${resp}[0][behind_vehicle][plate]  ${bv}[plate]
    Should Be Equal As Strings  ${resp}[0][comment]  new_comment
    ${plan}  Create A Order  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Order  ${plan}
    Rollback Order  ${plan}
    Check New Status And History  ${plan}  0  回退  确认
    ${resp}  Search Orders Based on User  ${sc_admin_token}
    Should Be Equal As Strings  ${resp}[0][behind_vehicle][plate]  ${bv}[plate]

Close While Confirmed
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Close A Plan  ${plan}
    Check New Status And History  ${plan}  3  关闭
    ${plan}  Create A Order  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Order  ${plan}
    Close A Order  ${plan}
    Check New Status And History  ${plan}  3  关闭

Disabled Action While Confirmed
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Update Failed  ${plan}
    Confirm Failed  ${plan}
    Check In Failed  ${plan}  ${dv}[phone]
    Enter Failed  ${plan}
    Deliver Failed  ${plan}
    Cancel Failed  ${plan}
    Cancel Check In Failed  ${plan}
    ${plan}  Create A Order  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Order  ${plan}
    Order Confirm Failed  ${plan}
    Order Cancel Failed  ${plan}

Rollback While Payed
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${bv_new}  Search behind Vehicle by Index  333
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan  ${plan}
    Rollback Plan  ${plan}
    Check New Status And History  ${plan}  1  回退  验款
    Manual Pay A Plan  ${plan}

Close While Payed
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan  ${plan}
    Close A Plan  ${plan}
    Check New Status And History  ${plan}  3  关闭

Cancel Check In While Payed
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan  ${plan}
    Check In A Plan  ${plan}
    ${plan}  Get Plan By Id  ${plan}[id]
    Should Not Be Empty  ${plan}[register_time]
    Cancel Check In Plan  ${plan}
    ${plan}  Get Plan By Id  ${plan}[id]
    Dictionary Should Not Contain Key  ${plan}  register_time

Disabled Action While Payed
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan  ${plan}
    Update Failed  ${plan}
    Confirm Failed  ${plan}
    Pay Failed  ${plan}
    Cancel Failed  ${plan}

Rollback While Entered
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan  ${plan}
    Plan Enter  ${plan}
    Rollback Plan  ${plan}
    Check New Status And History  ${plan}  2  回退  进厂
    Plan Enter  ${plan}
    ${plan}  Create A Order  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Order  ${plan}
    Plan Enter  ${plan}
    Rollback Order  ${plan}
    Check New Status And History  ${plan}  1  回退  进厂
    Plan Enter  ${plan}

Disabled Action While Entered
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan  ${plan}
    Plan Enter  ${plan}
    Update Failed  ${plan}
    Confirm Failed  ${plan}
    Pay Failed  ${plan}
    Enter Failed  ${plan}
    Cancel Failed  ${plan}
    Close Failed  ${plan}
    Cancel Check In Failed  ${plan}
    ${plan}  Create A Order  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Order  ${plan}
    Plan Enter  ${plan}
    Order Confirm Failed  ${plan}
    Enter Failed  ${plan}
    Order Cancel Failed  ${plan}
    Order Close Failed  ${plan}
    Cancel Check In Failed  ${plan}

Rollback While Delivered
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${cur_balance}  Get Cash Of A Company  ${buy_company1}[name]
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan  ${plan}
    Deliver A Plan  ${plan}  ${20}
    Rollback Plan  ${plan}
    Check New Status And History  ${plan}  2  回退  发车
    ${new_balance}  Get Cash Of A Company  ${buy_company1}[name]
    Should Be Equal As Numbers  ${new_balance}  ${cur_balance}
    Deliver A Plan  ${plan}  ${20}
    ${plan}  Create A Order  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Order  ${plan}
    Deliver A Plan  ${plan}  ${20}
    Rollback Order  ${plan}
    Check New Status And History  ${plan}  1  回退  发车
    Deliver A Plan  ${plan}  ${20}

Disabled Action While Delivered
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${cur_balance}  Get Cash Of A Company  ${buy_company1}[name]
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan  ${plan}
    Deliver A Plan  ${plan}  ${20}
    Update Failed  ${plan}
    Confirm Failed  ${plan}
    Pay Failed  ${plan}
    Check In Failed  ${plan}  ${dv}[phone]
    Enter Failed  ${plan}
    Deliver Failed  ${plan}
    Cancel Failed  ${plan}
    Close Failed  ${plan}
    Cancel Check In Failed  ${plan}
    ${plan}  Create A Order  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Order  ${plan}
    Deliver A Plan  ${plan}  ${20}
    Order Confirm Failed  ${plan}
    Check In Failed  ${plan}  ${dv}[phone]
    Enter Failed  ${plan}
    Deliver Failed  ${plan}
    Order Cancel Failed  ${plan}
    Order Close Failed  ${plan}
    Cancel Check In Failed  ${plan}

Disabled Action While Closed
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${cur_balance}  Get Cash Of A Company  ${buy_company1}[name]
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan  ${plan}
    Close A Plan  ${plan}
    Update Failed  ${plan}
    Confirm Failed  ${plan}
    Pay Failed  ${plan}
    Check In Failed  ${plan}  ${dv}[phone]
    Enter Failed  ${plan}
    Deliver Failed  ${plan}
    Cancel Failed  ${plan}
    Close Failed  ${plan}
    Rollback Failed  ${plan}
    Cancel Check In Failed  ${plan}
    ${plan}  Create A Order  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Order  ${plan}
    Close A Order  ${plan}
    Order Confirm Failed  ${plan}
    Check In Failed  ${plan}  ${dv}[phone]
    Enter Failed  ${plan}
    Deliver Failed  ${plan}
    Order Cancel Failed  ${plan}
    Order Close Failed  ${plan}
    Order Rollback Failed  ${plan}
    Cancel Check In Failed  ${plan}


*** Keywords ***
Update Failed
    [Arguments]  ${plan}
    ${bv_new}  Search behind Vehicle by Index  333
    ${update_info}  Create Dictionary  behind_vehicle_id=${bv_new}[id]  plan_time=2021-10-10 11:12:11  use_for=abcd  drop_address=def
    Set To Dictionary  ${update_info}  plan_id=${plan}[id]
    Req to Server  /customer/order_buy_update  ${bc1_user_token}  ${update_info}  ${True}

Order Confirm Failed
    [Arguments]  ${plan}
    ${req}  Create Dictionary  plan_id=${plan}[id]
    Req to Server  /buy_management/order_buy_confirm  ${sc_admin_token}  ${req}  ${True}

Confirm Failed
    [Arguments]  ${plan}
    ${req}  Create Dictionary  plan_id=${plan}[id]
    Req to Server  /sale_management/order_sale_confirm  ${sc_admin_token}  ${req}  ${True}

Order Rollback Failed
    [Arguments]  ${plan}
    ${req}  Create Dictionary  plan_id=${plan}[id]
    Req to Server  /buy_management/order_rollback  ${sc_admin_token}  ${req}  ${True}

Rollback Failed
    [Arguments]  ${plan}
    ${req}  Create Dictionary  plan_id=${plan}[id]
    Req to Server  /sale_management/order_rollback  ${sc_admin_token}  ${req}  ${True}

Pay Failed
    [Arguments]  ${plan}
    ${req}  Create Dictionary  plan_id=${plan}[id]
    Req to Server  /sale_management/order_sale_pay  ${sc_admin_token}  ${req}  ${True}

Check In Failed
    [Arguments]  ${plan}  ${dv_phone}
    ${do_info}  Driver Online  ${dv_phone}  1231312  12312312
    ${req}  Create Dictionary  open_id=${do_info}[open_id]  plan_id=${plan}[id]  lat=${123}  lon=${333}
    Req to Server  /global/driver_checkin  none  ${req}  ${True}

Enter Failed
    [Arguments]  ${plan}
    ${req}  Create Dictionary  plan_id=${plan}[id]
    Req to Server  /scale/vehicle_enter  ${sc_admin_token}  ${req}  ${True}

Deliver Failed
    [Arguments]  ${plan}
    ${req}  Create Dictionary  plan_id=${plan}[id]  p_weight=${10}  m_weight=${30}  count=${20}  p_time=2018-01-01  m_time=2018-01-01
    Req to Server  /scale/deliver  ${sc_admin_token}  ${req}  ${True}

Order Cancel Failed
    [Arguments]  ${plan}
    ${req}  Create Dictionary  plan_id=${plan}[id]
    Req to Server  /supplier/order_sale_cancel  ${bc1_user_token}  ${req}  ${True}

Cancel Failed
    [Arguments]  ${plan}
    ${req}  Create Dictionary  plan_id=${plan}[id]
    Req to Server  /customer/order_buy_cancel  ${bc1_user_token}  ${req}  ${True}

Order Close Failed
    [Arguments]  ${plan}
    ${req}  Create Dictionary  plan_id=${plan}[id]
    Req to Server  /buy_management/close  ${sc_admin_token}  ${req}  ${True}
Close Failed
    [Arguments]  ${plan}
    ${req}  Create Dictionary  plan_id=${plan}[id]
    Req to Server  /sale_management/close  ${sc_admin_token}  ${req}  ${True}

Cancel Check In Failed
    [Arguments]  ${plan}
    ${req}  Create Dictionary  plan_id=${plan}[id]
    Req to Server  /scale/cancel_check_in  ${sc_admin_token}  ${req}  ${True}

Check New Status And History
    [Arguments]  ${plan}  ${status}  @{action_types}
    ${cur_plan}  Get Plan By Id  ${plan}[id]
    Should Be Equal As Integers  ${cur_plan}[status]  ${status}
    ${latest_node}  Get Latest History Node  ${cur_plan}
    FOR  ${itr}  IN  @{action_types}
        Should Contain  ${latest_node}[action_type]  ${itr}
    END