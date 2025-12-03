*** Settings ***
Resource  audit_opt.resource
Suite Setup    Prepare Audit Environment
Suite Teardown    Cleanup Audit Environment
*** Test Cases ***
Audit Config
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

