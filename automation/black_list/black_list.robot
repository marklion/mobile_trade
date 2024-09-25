*** Settings ***
Resource  black_list.resource
Resource    ../safe_check/sc_opt.resource
Suite Setup   Prepare A Paied Plan
Suite Teardown  Cleanup Paied Plan
*** Test Cases ***
Test Add Vehicle To Blacklist
    [Teardown]  Cleanup Blacklist
    ${vehicle_ids}  Set Variable  1,2
    Add To Blacklist  ${vehicle_ids}  vehicle  违规车辆
    ${blacklist}  Get Blacklist
    Length Should Be  ${blacklist}  2

Test Add Driver To Blacklist
    [Teardown]  Cleanup Blacklist
    ${driver_ids}  Set Variable  1
    Add To Blacklist  ${driver_ids}  driver  违规司机
    ${blacklist}  Get Blacklist
    Length Should Be  ${blacklist}  1

Test Remove Single Item From Blacklist
    [Teardown]  Cleanup Blacklist
    ${vehicle_ids}  Set Variable  1,2
    Add To Blacklist  ${vehicle_ids}  vehicle  违规车辆
    ${blacklist}  Get Blacklist
    Length Should Be  ${blacklist}  2
    ${id_to_remove}  Convert To String  ${blacklist}[0][id]
    Remove From Blacklist  ${id_to_remove}
    ${updated_blacklist}  Get Blacklist
    Length Should Be  ${updated_blacklist}  1
    Should Not Be Equal  ${updated_blacklist}[0][id]  ${id_to_remove}

Test Remove All Items From Blacklist
    [Teardown]  Cleanup Blacklist
    ${vehicle_ids}  Set Variable  1,2
    ${driver_ids}  Set Variable  1
    Add To Blacklist  ${vehicle_ids}  vehicle  违规车辆
    Add To Blacklist  ${driver_ids}  driver  违规司机
    ${blacklist}  Get Blacklist
    Length Should Be  ${blacklist}  3
    ${ids_to_remove}  Evaluate  ",".join([str(item['id']) for item in ${blacklist}])
    Remove From Blacklist  ${ids_to_remove}
    ${updated_blacklist}  Get Blacklist
    Length Should Be  ${updated_blacklist}  0


Test Create Purchase Plan With Blacklisted Vehicle
    [Teardown]  Cleanup Blacklist
    ${vehicle_ids}  Set Variable  1
    Add To Blacklist  ${vehicle_ids}  vehicle  违规车辆
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]  exception=${True}
    Should Match Regexp  ${plan}  .*创建计划失败.*

Test Create Purchase Plan With Blacklisted Driver
    [Teardown]  Cleanup Blacklist
    ${driver_ids}  Set Variable  1
    Add To Blacklist  ${driver_ids}  driver  违规司机
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]  exception=${True}
    Should Match Regexp  ${plan}  .*创建计划失败.*

Test Create Sales Plan With Blacklisted Vehicle
    [Teardown]  Cleanup Blacklist
    ${vehicle_ids}  Set Variable  1
    Add To Blacklist  ${vehicle_ids}  vehicle  违规车辆
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}   Create A Order  ${bv}[id]  ${mv}[id]  ${dv}[id]  exception=${True}
    Should Match Regexp  ${plan}  .*创建计划失败.*

Test Create Sales Plan With Blacklisted Driver
    [Teardown]  Cleanup Blacklist
    ${driver_ids}  Set Variable  1
    Add To Blacklist  ${driver_ids}  driver  违规司机
    ${mv}  Search Main Vehicle by Index  0
    ${bv}  Search behind Vehicle by Index  0
    ${dv}  Search Driver by Index  0
    ${plan}   Create A Order  ${bv}[id]  ${mv}[id]  ${dv}[id]  exception=${True}
    Should Match Regexp  ${plan}  .*创建计划失败.*



