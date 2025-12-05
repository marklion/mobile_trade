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
    ${update_info}  Create Dictionary  driver_phone=1901  main_vehicle_plate=hh11  comment=new_comment
    Update Plan by Creator  ${plan}[id]  &{update_info}
    ${resp}  Search Plans Based on User  ${sc_admin_token}
    Should Be Equal As Strings  ${resp}[0][driver][phone]  1901
    Should Be Equal As Strings  ${resp}[0][main_vehicle][plate]  hh11
    Should Be Equal As Strings  ${resp}[0][behind_vehicle][plate]  ${bv}[plate]
    Should Be Equal As Strings  ${resp}[0][comment]  new_comment
    Should Be Equal As Strings  ${resp}[0][use_for]  测试用途
    ${update_info}  Create Dictionary  behind_vehicle_plate=bb22  plan_time=2021-10-10 11:12:11  use_for=abcd  drop_address=def
    Update Plan by Owner  ${plan}[id]  &{update_info}
    ${resp}  Search Plans Based on User  ${sc_admin_token}
    Should Be Equal As Strings  ${resp}[0][plan_time]  2021-10-10 11:12:11
    Should Be Equal As Strings  ${resp}[0][use_for]  abcd
    Should Be Equal As Strings  ${resp}[0][drop_address]  def
    Should Be Equal As Strings  ${resp}[0][behind_vehicle][plate]  bb22
    Should Be Equal As Strings  ${resp}[0][driver][phone]  1901
    Should Be Equal As Strings  ${resp}[0][main_vehicle][plate]  hh11
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
    ${plan}  Create A Order  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Order  ${plan}
    Rollback Order  ${plan}
    Check New Status And History  ${plan}  0  回退  确认
    ${resp}  Search Orders Based on User  ${sc_admin_token}
    Should Be Equal As Strings  ${resp}[0][behind_vehicle][plate]  ${bv}[plate]

Update While Confirmed
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${bv_new}  Search behind Vehicle by Index  333
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    ${update_info}  Create Dictionary  behind_vehicle_plate=f121  plan_time=2021-10-10 11:12:11  use_for=abcd  drop_address=def
    Update Plan by Creator    ${plan}[id]  &{update_info}
    ${resp}  Search Plans Based on User  ${sc_admin_token}
    Should Be Equal As Strings  ${resp}[0][behind_vehicle][plate]  f121
    ${plan}  Create A Order  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Order  ${plan}
    ${update_info}  Create Dictionary  main_vehicle_plate=f121
    Update Order by Owner    ${plan}[id]  &{update_info}
    ${resp}  Search Orders Based on User  ${sc_admin_token}
    Should Be Equal As Strings  ${resp}[0][main_vehicle][plate]  f121

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
Cancel While Confirmed
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Cancel A Plan  ${plan}
    Check New Status And History  ${plan}  3  取消
    ${plan}  Create A Order  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Order  ${plan}
    Cancel A Order  ${plan}
    Check New Status And History  ${plan}  3  取消

Disabled Action While Confirmed
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Confirm Failed  ${plan}
    Check In Failed  ${plan}  ${dv}[phone]
    Enter Failed  ${plan}
    Deliver Failed  ${plan}
    Cancel Check In Failed  ${plan}
    ${plan}  Create A Order  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Order  ${plan}
    Order Confirm Failed  ${plan}

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

Update While Payed
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${bv_new}  Search behind Vehicle by Index  333
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan  ${plan}
    ${update_info}  Create Dictionary  driver_phone=33445
    Update Plan by Owner    ${plan}[id]  &{update_info}
    ${resp}  Search Plans Based on User  ${sc_admin_token}
    Should Be Equal As Strings  ${resp}[0][driver][phone]  33445
    Check New Status And History  ${plan}  2  改为  33445

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

Cancel While Payed
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan  ${plan}
    Cancel A Plan    ${plan}
    Check New Status And History  ${plan}  3  取消
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
    Confirm Failed  ${plan}
    Pay Failed  ${plan}

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
    Check New Status And History  ${plan}  2  撤销  进厂
    Plan Enter  ${plan}
    ${plan}  Create A Order  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Order  ${plan}
    Plan Enter  ${plan}
    Rollback Order  ${plan}
    Check New Status And History  ${plan}  1  撤销  进厂
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

Rollback While Checkout If Checkout Delay
    [Setup]  Set Stuff Checkout Delay
    [Teardown]  Run Keywords  Plan Reset  AND  Set Stuff Checkout Delay  delay=${False}
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${cur_balance}  Get Cash Of A Company  ${buy_company1}[name]
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan  ${plan}
    Deliver A Plan  ${plan}  ${20}
    Checkout A Plan    ${plan}
    Rollback Plan  ${plan}
    Check New Status And History  ${plan}  2  回退  结算
    ${new_balance}  Get Cash Of A Company  ${buy_company1}[name]
    Should Be Equal As Numbers  ${new_balance}  ${cur_balance}
    Rollback Plan    ${plan}
    Check New Status And History  ${plan}  2  回退  发车
    Deliver A Plan  ${plan}  ${20}
    Checkout A Plan    ${plan}
    ${new_balance}  Get Cash Of A Company  ${buy_company1}[name]
    Should Not Be Equal    ${new_balance}    ${cur_balance}
    Rollback Plan  ${plan}
    Checkout A Plan    ${plan}
    ${new_balance}  Get Cash Of A Company  ${buy_company1}[name]
    Should Not Be Equal    ${new_balance}    ${cur_balance}

Disabled Action If Checkout_delay
    [Setup]  Set Stuff Checkout Delay
    [Teardown]  Run Keywords  Plan Reset  AND  Set Stuff Checkout Delay  delay=${False}
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${cur_balance}  Get Cash Of A Company  ${buy_company1}[name]
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan  ${plan}
    Checkout Failure A Plan    ${plan}
    Deliver A Plan  ${plan}  ${20}
    Checkout A Plan    ${plan}
    Checkout Failure A Plan    ${plan}

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

Manual Weight With Count
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    ${cur_balance}  Get Cash Of A Company  ${buy_company1}[name]
    Manual Pay A Plan  ${plan}
    Manual Weight A Plan With Count  ${plan}
    ${new_balance}  Get Cash Of A Company  ${buy_company1}[name]
    Should Not Be Equal    ${new_balance}    ${cur_balance}
    Check New Status And History  ${plan}  3  结算

Manual Weight Without Count
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan  ${plan}
    ${cur_balance}  Get Cash Of A Company  ${buy_company1}[name]
    Manual Weight A Plan Without Count  ${plan}
    ${new_balance}  Get Cash Of A Company  ${buy_company1}[name]
    Should Be Equal    ${new_balance}    ${cur_balance}
    Check New Status And History  ${plan}  2  验款

Pay Plan by Different Role
    [Teardown]  Run Keywords  Plan Reset  AND  Set Pay Verify Role  ${False}
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    ${cash_user}  Add User Only Having Cash
    ${sale_user}  Add User Only Having Sale
    Confirm A Plan  ${plan}

    Manual Pay A Plan    ${plan}  ${sale_user}
    Rollback Plan    ${plan}

    Manual Pay A Plan    ${plan}  ${sale_user}  ${True}  ${True}
    Manual Pay A Plan    ${plan}  ${cash_user}  ${True}  ${True}
    Manual Pay A Plan    ${plan}  ${cash_user}  ${False}  ${True}

    Set Pay Verify Role  ${True}
    Manual Pay A Plan    ${plan}  ${cash_user}  ${True}
    Rollback Plan    ${plan}

    Manual Pay A Plan    ${plan}  ${cash_user}  ${False}  ${True}
    Manual Pay A Plan    ${plan}  ${sale_user}  ${True}  ${True}
    Manual Pay A Plan    ${plan}  ${sale_user}  ${False}  ${True}

Dup Deliver Protect
    [Teardown]  Plan Reset
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan  ${plan}
    Manual Pay A Plan  ${plan}
    ${before_balance}  Get Cash Of A Company  ${buy_company1}[name]
    Deliver A Plan Dup    ${plan}    ${1}
    ${after_balance}  Get Cash Of A Company  ${buy_company1}[name]
    ${minus}  Evaluate  ${before_balance} - ${after_balance}
    Should Be Equal As Numbers    ${minus}    ${plan}[unit_price]

Dup Plan Limit Verify
    [Teardown]  Run Keywords  Plan Reset  AND  Set Dup Not Permit    ${True}
    [Setup]  Set Dup Not Permit    ${False}
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan1}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    ${plan2}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]
    Confirm A Plan    ${plan1}
    Confirm Failed    ${plan2}

*** Keywords ***
Add User Only Having Cash
    ${user_token}  New User Login    19911  ${sale_company}[name]  19911opid  cash_user
    Add Module To User    ${sc_admin_token}    19911    cash  ${False}  cash_only
    RETURN  ${user_token}

Add User Only Having Sale
    ${user_token}  New User Login    19912  ${sale_company}[name]  19912opid  sale_user
    Add Module To User    ${sc_admin_token}    19912    sale_management  ${False}  sale_only
    RETURN  ${user_token}
Update Failed
    [Arguments]  ${plan}
    ${bv_new}  Search behind Vehicle by Index  333
    ${update_info}  Create Dictionary  behind_vehicle_id=${bv_new}[id]  plan_time=2021-10-10 11:12:11  use_for=abcd  drop_address=def
    Set To Dictionary  ${update_info}  plan_id=${plan}[id]
    Req to Server  /customer/order_buy_update  ${bc1_user_token}  ${update_info}  ${True}
    Req to Server  /supplier/order_sale_update  ${bc1_user_token}  ${update_info}  ${True}
    Req to Server  /sale_management/order_update    ${sc_admin_token}    ${update_info}  ${True}
    Req to Server  /buy_management/order_update    ${sc_admin_token}    ${update_info}  ${True}

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
    ${req}  Create Dictionary  plan_id=${plan}[id]  msg=reason
    Req to Server  /buy_management/order_rollback  ${sc_admin_token}  ${req}  ${True}

Rollback Failed
    [Arguments]  ${plan}
    ${req}  Create Dictionary  plan_id=${plan}[id]  msg=reason
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

Checkout Failure A Plan
    [Arguments]  ${plan}  ${token}=${bc1_user_token}
    ${req}  Create Dictionary  plan_id=${plan}[id]
    Req to Server    /customer/checkout_plan    ${token}    ${req}  ${True}

Manual Weight A Plan With Count
    [Arguments]  ${plan}  ${token}=${sc_admin_token}
    ${req}  Create Dictionary  plan_id=${plan}[id]  count=${1000}
    Req to Server  /scale/manual_weight  ${token}  ${req}
    ${cur_plan}  Get Plan By Id  ${plan}[id]
    Should Be Equal As Integers  ${cur_plan}[status]  3

Manual Weight A Plan Without Count
    [Arguments]  ${plan}  ${token}=${sc_admin_token}
    ${req}  Create Dictionary  plan_id=${plan}[id]   count=${0}
    Req to Server  /scale/manual_weight  ${token}  ${req}
    ${cur_plan}  Get Plan By Id  ${plan}[id]
    Should Be Equal As Integers  ${cur_plan}[status]  2
