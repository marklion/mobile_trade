*** Settings ***
Resource  ../api_base.resource
Resource  ../database.resource
Resource  ../rbac/rbac_curd.resource
Resource  ../stuff/stuff_opt.resource
Resource  group.resource

*** Keywords ***
# 集团母公司用户 + 成员公司卖货 + 买方下单一条未确认计划；已授权母公司管理员对成员 can_view+can_operate
Prepare Group Member Seller One Unconfirmed Plan
    ${parent}  Create One Company  rf_gord_parent
    ${member}  Create One Company  rf_gord_member
    ${buyer}  Create One Company  rf_gord_buyer
    ${p_tok}  Login As Admin Of Company  ${parent}[id]  99887766110  rf_gord_pa
    ${p_self}  Get Self Info  ${p_tok}
    Convert To Group By Super Admin  ${parent}[id]  ${p_self}[id]
    ${add_m}  Create Dictionary  member_company_id=${member}[id]
    Req to Server  /group/group_member_add  ${p_tok}  ${add_m}
    Add Module To Company  ${parent}[id]  group
    Add Module To Company  ${parent}[id]  sale_management
    Add Module To User  ${p_tok}  99887766110  group
    Add Module To User  ${p_tok}  99887766110  sale_management
    ${m_tok}  Login As Admin Of Company  ${member}[id]  99887766111  rf_gord_mem
    Add Module To Company  ${member}[id]  stuff
    Add Module To Company  ${member}[id]  sale_management
    Add Module To User  ${m_tok}  99887766111  stuff
    Add Module To User  ${m_tok}  99887766111  sale_management
    ${cust_req}  Create Dictionary  customer_id=${buyer}[id]
    Req to Server  /sale_management/contract_make  ${m_tok}  ${cust_req}
    Add A Stuff To Sale  gord_stuff  gord_c  ${22}  ${m_tok}
    Add A Stuff To Contract  gord_stuff  ${buyer}[name]  ${m_tok}
    ${buy_admin_tok}  Login As Admin Of Company  ${buyer}[id]  99887766113  rf_gord_badm
    Add Module To Company  ${buyer}[id]  customer
    ${b_tok}  New User Login  99887766112  ${buyer}[name]  rf_gord_buy_open  gord_bu
    Add Module To User  ${buy_admin_tok}  99887766112  customer
    Authorize User to Contract  ${buyer}[name]  99887766112  ${m_tok}
    @{stuffs}  Req Get to Server  /customer/get_stuff_on_sale  ${b_tok}  stuff
    ${stuff0}  Set Variable  ${stuffs}[0]
    ${mv}  Search Main Vehicle by Index  0  ${b_tok}
    ${bv}  Search behind Vehicle by Index  0  ${b_tok}
    ${dv}  Search Driver by Index  0  ${b_tok}
    ${plan}  Create A Plan  ${bv}[id]  ${mv}[id]  ${dv}[id]  ${b_tok}  today  gord_rmk  gord_addr  gord_use  ${stuff0}[id]
    ${ctx}  Create Dictionary
    ...  parent_token=${p_tok}
    ...  member_token=${m_tok}
    ...  buyer_token=${b_tok}
    ...  parent=${parent}
    ...  member=${member}
    ...  buyer=${buyer}
    ...  plan=${plan}
    ...  parent_self_id=${p_self}[id]
    ...  stuff=${stuff0}
    RETURN  ${ctx}

Grant Parent Self Operate On Member
    [Arguments]  ${parent_token}  ${member_company_id}  ${parent_self_user_id}
    Group Grant Upsert Self On Member  ${parent_token}  ${member_company_id}  ${parent_self_user_id}  ${True}  ${True}

Prepare Group Member Seller One Unconfirmed Plan With Operate Grant
    ${ctx}  Prepare Group Member Seller One Unconfirmed Plan
    Grant Parent Self Operate On Member  ${ctx}[parent_token]  ${ctx}[member][id]  ${ctx}[parent_self_id]
    RETURN  ${ctx}

Get Sale Plan By Id With Token And Stat Context
    [Arguments]  ${token}  ${plan_id}  ${stat_context_company_id}=${EMPTY}
    ${req}  Create Dictionary  start_time=2018-01-01  end_time=2090-12-31
    IF  '${stat_context_company_id}' != '${EMPTY}'
        Set To Dictionary  ${req}  stat_context_company_id=${stat_context_company_id}
    END
    @{plans}  Req Get to Server  /sale_management/order_search  ${token}  plans  -1  &{req}
    FOR  ${p}  IN  @{plans}
        ${pid}  Get From Dictionary  ${p}  id
        ${match}  Evaluate  int(${pid}) == int(${plan_id})
        IF  ${match}
            RETURN  ${p}
        END
    END
    Fail  未在 order_search 中找到 plan_id=${plan_id}
