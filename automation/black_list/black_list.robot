*** Settings ***
Resource  black_list.resource
Suite Setup  Prepare Sale and Buy
Suite Teardown  Cleanup Sale and Buy
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

Test Remove Vehicle From Blacklist
    [Teardown]  Cleanup Blacklist
    ${vehicle_ids}  Set Variable  1,2
    Add To Blacklist  ${vehicle_ids}  vehicle  违规车辆
    Remove From Blacklist  ${vehicle_ids}  vehicle
    ${blacklist}  Get Blacklist
    Length Should Be  ${blacklist}  0

Test Remove Driver From Blacklist
    [Teardown]  Cleanup Blacklist
    ${driver_ids}  Set Variable  1
    Add To Blacklist  ${driver_ids}  driver  违规司机
    Remove From Blacklist  ${driver_ids}  driver
    ${blacklist}  Get Blacklist
    Length Should Be  ${blacklist}  0
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



