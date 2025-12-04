*** Settings ***
Resource  audit_opt.resource
Suite Setup    Prepare Audit Environment
Suite Teardown    Cleanup Audit Environment
*** Test Cases ***
Audit Config
    [Teardown]  Clear Audit Config
    ${all_apis}  Req Get to Server    /audit/get_all_api    ${sc_admin_token}  apis
    Should Not Be Empty    ${all_apis}
    ${apis_under_audit}  Req Get to Server    /audit/get_audit_configs    ${sc_admin_token}    configs
    Should Be Empty    ${apis_under_audit}
    Add Audit Config    /rbac/verify_bid_write  公司管理员
    Add Audit Config    /rbac/verify_bid_write  ""role_name_0
    ${apis_under_audit}  Req Get to Server    /audit/get_audit_configs    ${sc_admin_token}    configs
    Length Should Be    ${apis_under_audit}    1
    Add Audit Config    /buy_management/get_contract_by_supplier
    Add Audit Config    /buy_management/export_plans
    ${apis_under_audit}  Req Get to Server    /audit/get_audit_configs    ${sc_admin_token}    configs
    Length Should Be    ${apis_under_audit}    3
    Del Audit Config    /buy_management/get_contract_by_supplier
    ${apis_under_audit}  Req Get to Server    /audit/get_audit_configs    ${sc_admin_token}    configs
    Length Should Be    ${apis_under_audit}    2

Set Audit And Check
    [Teardown]  Clear Audit Config
    Charge To A Company    ${buy_company1}[id]    ${64}  check_audit=${False}
    Add Audit Config    /cash/charge
    ${orig_balance}  Get Cash Of A Company    ${buy_company1}[name]
    Charge To A Company    ${buy_company1}[id]    ${64}  check_audit=${True}
    ${new_balance}  Get Cash Of A Company    ${buy_company1}[name]
    Should Be Equal As Numbers    ${orig_balance}  ${new_balance}
    ${records}  Get Audit Records
    Length Should Be    ${records}    1
    Approve Audit Record    ${records}[0][id]
    ${new_balance}  Get Cash Of A Company    ${buy_company1}[name]
    Should Not Be Equal As Numbers    ${orig_balance}    ${new_balance}

Audit To Specify Role
    [Teardown]   Clear Audit Config
    ${new_user_token}  New User Login    new_user_phone    ${sale_company}[name]    new_user_open_id
    Bind Role To User    ${sc_admin_token}    ""role_name_0    new_user_phone
    Bind Role To Module    ${sc_admin_token}    ""role_name_0    audit
    ${orig_balance}  Get Cash Of A Company    ${buy_company1}[name]
    Add Audit Config    /cash/charge  ""role_name_1
    Charge To A Company    ${buy_company1}[id]    ${64}  check_audit=${True}
    ${records}  Get Audit Records  ${new_user_token}
    Length Should Be    ${records}    0
    Add Audit Config    /cash/charge  ""role_name_0
    Charge To A Company    ${buy_company1}[id]    ${65}  check_audit=${True}
    ${records}  Get Audit Records  ${new_user_token}
    Length Should Be    ${records}    2
    Approve Audit Record    ${records}[0][id]
    Reject Audit Record    ${records}[1][id]
    ${records}  Get Audit Records  ${new_user_token}  ${0}
    Length Should Be    ${records}    0
    ${new_balance}  Get Cash Of A Company    ${buy_company1}[name]
    ${expected_balance}    Evaluate    ${orig_balance} + 65
    Should Be Equal As Numbers    ${expected_balance}    ${new_balance}

