*** Settings ***
Resource  stuff_opt.resource

Suite Setup  Prepare Companies And Users
Suite Teardown  Clean Up Companies And Users

*** Test Cases ***
Stuff For Sold Operation
    [Teardown]  Stuff Reset
    Add A Stuff To Sale  st1  asdfa
    Add A Stuff To Sale  st2  aaaaaaa
    Add A Stuff To Sale  st1  asdasdfasdf
    @{stuffs_found}  Req Get to Server  /stuff/get_all  ${sc_admin_token}  stuff
    Length Should Be  ${stuffs_found}  2
    Should Be Equal As Strings  ${stuffs_found[0]}[name]  st1
    Should Be Equal As Strings  ${stuffs_found[0]}[comment]  asdasdfasdf
    Should Be Equal As Strings  ${stuffs_found[1]}[name]  st2
    Del A Stuff From Sale  ${stuffs_found[1]}[id]
    @{stuffs_found}  Req Get to Server  /stuff/get_all  ${sc_admin_token}  stuff
    Length Should Be  ${stuffs_found}  1
    Should Be Equal As Strings  ${stuffs_found[0]}[name]  st1

Contract Maintain
    [Teardown]  Contract Reset
    Add A Company As Customer  ${buy_company1}[id]
    Add A Company As Customer  ${buy_company2}[id]
    Add A Company As Supplier  ${buy_company1}[id]
    Add A Company As Supplier  ${buy_company2}[id]
    ${req}  Create Dictionary
    ${found_contracts}  Req Get to Server  /customer/contract_get  ${bc1_user_token}  contracts
    Length Should Be  ${found_contracts}  1
    ${found_contracts}  Req Get to Server  /supplier/contract_get  ${bc1_user_token}  contracts
    Length Should Be  ${found_contracts}  1
    ${found_contracts}  Req Get to Server  /customer/contract_get  ${bc2_user_token}  contracts
    Length Should Be  ${found_contracts}  1
    ${found_contracts}  Req Get to Server  /supplier/contract_get  ${bc2_user_token}  contracts
    Length Should Be  ${found_contracts}  1
    ${found_contracts}  Req Get to Server  /sale_management/contract_get  ${sc_admin_token}  contracts
    Length Should Be  ${found_contracts}  2
    ${update_info}  Create Dictionary  begin_time=2019-01-01  end_time=2040-01-02
    Update A Sale Contract    ${found_contracts}[0][id]  &{update_info}
    ${found_contracts}  Req Get to Server  /sale_management/contract_get  ${sc_admin_token}  contracts
    Should Be Equal As Strings    ${found_contracts}[0][begin_time]    ${update_info}[begin_time]
    Should Be Equal As Strings    ${found_contracts}[0][end_time]    ${update_info}[end_time]
    Del A Customer Contract  ${found_contracts[1]}[id]
    ${found_contracts}  Req Get to Server  /sale_management/contract_get  ${sc_admin_token}  contracts
    Length Should Be  ${found_contracts}  1
    ${found_contracts}  Req Get to Server  /buy_management/contract_get  ${sc_admin_token}  contracts
    Length Should Be  ${found_contracts}  2
    Update A Sale Contract    ${found_contracts}[0][id]  &{update_info}
    ${found_contracts}  Req Get to Server  /buy_management/contract_get  ${sc_admin_token}  contracts
    Should Be Equal As Strings    ${found_contracts}[0][begin_time]    ${update_info}[begin_time]
    Should Be Equal As Strings    ${found_contracts}[0][end_time]    ${update_info}[end_time]
    Del A Supplier Contract  ${found_contracts[0]}[id]
    ${found_contracts}  Req Get to Server  /buy_management/contract_get  ${sc_admin_token}  contracts
    Length Should Be  ${found_contracts}  1

Stuff For Buy
    [Teardown]  Run Keywords  Contract Reset  AND  Stuff Reset
    Add A Company As Supplier  ${buy_company1}[id]
    Add A Stuff To Buy  bt1  bt1_name
    @{stuffs_found}  Req Get to Server  /supplier/get_stuff_need_buy  ${bc1_user_token}  stuff
    Length Should Be  ${stuffs_found}  1


Stuff via Contract Maintain
    [Teardown]  Run Keywords  Contract Reset  AND  Stuff Reset
    [Setup]  Run Keywords  Add A Company As Customer  ${buy_company1}[id]
    ...    AND  Add A Company As Customer  ${buy_company2}[id]
    ...    AND  Add A Stuff to Sale  st1  abcdddd
    Add A Stuff To Contract  st1  bc1
    Add A Stuff To Contract  st1  bc2
    @{stuffs_found}  Req Get to Server  /customer/get_stuff_on_sale  ${bc1_user_token}  stuff
    Length Should Be  ${stuffs_found}  1
    Should Be Equal As Numbers  ${stuffs_found[0]}[price]  0
    @{stuffs_found}  Req Get to Server  /customer/get_stuff_on_sale  ${bc2_user_token}  stuff
    Length Should Be  ${stuffs_found}  1
    Should Be Equal As Numbers  ${stuffs_found[0]}[price]  0
    Del A Stuff From Contract  st1  bc1
    @{stuffs_found}  Req Get to Server  /customer/get_stuff_on_sale  ${bc1_user_token}  stuff
    Length Should Be  ${stuffs_found}  0

Contract Charge And Check
    [Teardown]  Run Keywords  Contract Reset  AND  Stuff Reset
    [Setup]  Run Keywords  Add A Company As Customer  ${buy_company1}[id]
    ...    AND  Add A Company As Customer  ${buy_company2}[id]
    ${contract_id}  Charge To A Company  ${buy_company1}[id]  ${1200}  abcd
    ${found_contracts}  Req Get to Server  /customer/contract_get  ${bc1_user_token}  contracts
    Should Be Equal As Numbers  ${found_contracts[0]}[balance]  ${1200}
    ${found_contracts}  Req Get to Server  /sale_management/contract_get  ${sc_admin_token}  contracts
    FOR  ${itr}  IN  @{found_contracts}
        ${cust_name}  Get From Dictionary  ${itr}[company]  name
        IF  $cust_name == 'bc1'
            Should Be Equal As Numbers  ${itr}[balance]  1200
            Exit For Loop
        END
    END
    ${req}  Create Dictionary  contract_id=${contract_id}
    ${resp}  Req Get to Server  /customer/get_charge_history  ${bc1_user_token}  histories  ${-1}  &{req}
    Should Be Equal As Numbers  ${resp}[0][cash_increased]  1200
    Should Be Equal As Strings  ${resp}[0][comment]  abcd

    ${resp}  Get Charge History    ${contract_id}
    Should Be Equal As Numbers  ${resp}[0][cash_increased]  1200
    Should Be Equal As Strings  ${resp}[0][comment]  abcd

Change Stuff Price And Check
    [Teardown]  Stuff Reset
    Add A Stuff To Sale  st1  asdfa
    Add A Stuff To Sale  st2  aaaaaaa
    @{stuffs_found}  Req Get to Server  /stuff/get_all  ${sc_admin_token}  stuff
    Change Stuff Price  ${stuffs_found[0]}[id]  ${12341}
    @{stuffs_found}  Req Get to Server  /stuff/get_all  ${sc_admin_token}  stuff
    Should Be Equal As Numbers  ${stuffs_found}[0][price]  12341
    Should Be Equal As Numbers  ${stuffs_found}[1][price]  0
    ${req}  Create Dictionary  stuff_id=${stuffs_found[0]}[id]
    ${resp}  Req Get to Server  /stuff/get_price_history  ${sc_admin_token}  histories  ${-1}  &{req}
    Should Contain  ${resp}[0][comment]  test_change

Sct Scale Item Test
    [Teardown]  Stuff Reset
    ${new_stuff}  Add A Stuff To Sale  st1  asdfa
    ${stuff_id}  Set Variable  ${new_stuff}[id]
    ${all_items}  Get Sct Scale Item    ${stuff_id}
    Should Be Empty    ${all_items}

    Add Sct Scale Item    ${stuff_id}    ssi1
    Add Sct Scale Item    ${stuff_id}    ssi2
    Add Sct Scale Item    ${stuff_id}    ssi2

    ${all_items}  Get Sct Scale Item    ${stuff_id}
    Length Should Be  ${all_items}  2
    Should Be Equal As Strings    ${all_items}[1][name]    ssi2
    Should Be Equal As Strings    ${all_items}[0][name]    ssi1

    Update Sct Scale Item    ${all_items}[1][id]    nssi
    ${all_items}  Get Sct Scale Item    ${stuff_id}
    Length Should Be  ${all_items}  2
    Should Be Equal As Strings    ${all_items}[1][name]    nssi
    Should Be Equal As Strings    ${all_items}[0][name]    ssi1

    Del Sct Scale Item    ${all_items}[0][id]
    ${all_items}  Get Sct Scale Item    ${stuff_id}
    Length Should Be  ${all_items}  1
    Should Be Equal As Strings    ${all_items}[0][name]    nssi

Second Unit Config Test
    [Teardown]  Stuff Reset
    ${new_stuff}  Add A Stuff To Sale  st1  asdfa
    # 添加一个 stuff
    Set Stuff Second Unit Coefficient  ${new_stuff}[id]  千克    ${0.5}
    # 添加一个物料的第二单位和系数 单位设置为千克 系数设置为0.5
    @{stuffs_found}  Req Get to Server  /stuff/get_all  ${sc_admin_token}  stuff
    # 查询一个物料的第二单位和系数 用一个数组去接收返回值
    #验证是否有这个物料单位
    Should Be Equal As Strings  ${stuffs_found[0]}[second_unit]  千克
    # 验证是否有这个物料系数
    Should Be Equal As Numbers  ${stuffs_found[0]}[coefficient]  0.5
    Del Stuff Second Unit Coefficient  ${new_stuff}[id]
    # 删除一个物料的第二单位和系数 单位设置为空 系数设置为1
    Update Stuff Second Unit Coefficient  ${new_stuff}[id]  吨   ${1.2}
    #更新一个物料的第二单位和系数 单位更新为吨 系数更新为1.2
    @{stuffs_changed}  Req Get to Server  /stuff/get_all  ${sc_admin_token}  stuff
    # 验证是否有这个物料单位 （更新后）
    Should Be Equal As Strings  ${stuffs_changed[0]}[second_unit]  吨
    Should Be Equal As Numbers  ${stuffs_changed[0]}[coefficient]  1.2

Config Subsidy Test
    [Teardown]  Stuff Reset
    ${s1}  Add A Stuff To Sale    s1  s1
    ${s2}  Add A Stuff To Sale    s2  s2
    ${s3}  Add A Stuff To Sale    s3  s3
    #重复设置给物料2添加相同补贴门槛的折扣值
    Add Subsidy    ${s2}[id]  ${10}    ${6}   ${null}
    Add Subsidy    ${s2}[id]  ${10}    ${8.4}  ${null}
    Add Subsidy    ${s3}[id]  ${10}    ${null}  ${3100}
    Add Subsidy    ${s3}[id]  ${10}    ${null}  ${4100}
    #给物料1添加两个门槛的折扣值
    Add Subsidy    ${s1}[id]  ${40.39}    ${7}  ${null}
    Add Subsidy    ${s1}[id]  ${30.3}    ${8}  ${null}

    ${got_subsidies}  Get Subsidy
    Length Should Be    ${got_subsidies}    3
    #获取到的补贴数据应该是按物料和门槛排序
    Should Be Equal As Numbers    ${got_subsidies}[0][gate]  30.3
    Should Be Equal As Numbers    ${got_subsidies}[1][discount]    7
    Should Be Equal As Strings    ${got_subsidies}[2][stuff][name]    s2

    Del Subsidy    ${got_subsidies}[2][id]
    ${got_subsidies}  Get Subsidy
    Length Should Be    ${got_subsidies}    2
    Should Be Equal As Numbers    ${got_subsidies}[0][gate]  30.3
    Should Be Equal As Numbers    ${got_subsidies}[1][discount]    7

Config Extra Info Test
    [Teardown]  Extra Info Reset
    Add Extra Info Config    e1
    Add Extra Info Config    e2
    Add Extra Info Config    e3
    ${extra_info_configs}  Get Extra Info Config
    Length Should Be    ${extra_info_configs}    3
    Should Be Equal As Strings    ${extra_info_configs}[0][title]    e3
    Del Extra Info Config    ${extra_info_configs}[1][id]
    ${extra_info_configs}  Get Extra Info Config
    Should Be Equal As Strings    ${extra_info_configs}[1][title]    e1