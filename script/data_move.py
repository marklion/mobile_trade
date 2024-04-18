#!/usr/bin/python3
import sqlite3
import requests
import sys
import time
import traceback

admin_token = ""

def req_to_server(url, req, token=None):
    global admin_token
    if token == None:
        token = admin_token
    begin_time = time.time_ns()
    response = requests.post('http://localhost:8080/api/v1' + url, headers={"Content-Type": "application/json", "token":token}, json=req)
    ret = response.json()
    result = ''
    end_time = time.time_ns()
    if ret["err_msg"] == '':
        result = ret["result"]
    else:
        print("API:%s Time taken: %d, resp:%s" % (url, (end_time - begin_time)/1000000, ret))
        raise Exception(ret["err_msg"])
    return result

def login(phone):
    token = req_to_server('/rbac/login_password', {"phone": phone, "password":"Mobile_P@ssw0rd_Trade"}, '')["token"]
    return token

def prepare_api():
    global admin_token
    admin_token = login('18911992582')

def get_data_from_db(conn, sql):
    cursor = conn.cursor()
    cursor.execute(sql)
    rows = cursor.fetchall()
    conn.commit()
    conn.close()
    if len(rows) == 0:
        print("No data found for sql: %s" % sql)
    return rows

def get_data_from_orig_db(sql):
    conn = sqlite3.connect("/database/pa.db")
    return get_data_from_db(conn, sql)

def get_data_from_cur_db(sql):
    conn = sqlite3.connect("/database/mt.db")
    return get_data_from_db(conn, sql)

def clean_company():
    records = get_data_from_orig_db("SELECT * FROM company_table;")
    for item in records:
        if "内蒙古中能天然气有限公司" == item[1]:
            continue
        found_contract = get_data_from_orig_db("SELECT * FROM contract_table WHERE a_side_ext_key = '%d' OR b_side_ext_key = '%d';" % (item[0], item[0]))
        if len(found_contract) == 0:
            get_data_from_orig_db("DELETE FROM company_table WHERE PRI_ID = " + str(item[0]) + ";")

def company_move():
    clean_company()
    records = get_data_from_orig_db("SELECT * FROM company_table;")
    for item in records:
        req = {
            "name":item[1],
            "notice":item[3],
            "address":item[5],
            "contact":item[6],
            "attachment":item[7],
            "third_key":item[10],
            "third_url":item[11],
            "third_token":item[13],
            "stamp_pic":item[14],
            "zc_url":item[15],
            "zh_ssid":item[16],
            "event_type":item[17],
            "remote_event_url":item[18],
            "driver_notice":item[19],
            "zc_rpc_url":item[20],
            "zczh_back_end":item[22],
            "zczh_back_token":item[23],
        }
        company_id = req_to_server('/rbac/company_add', req)["id"]
        if item[4] == 1:
            all_modules = [2,3,4,5,6,7,8,9,10]
            for single_module in all_modules:
                req = {
                    "company_id":company_id,
                    "module_id":single_module,
                }
                req_to_server('/rbac/company_add_module', req)

def clean_user():
    records = get_data_from_orig_db("SELECT * FROM userinfo_table;")
    for item in records:
        found_user = get_data_from_orig_db("SELECT * FROM company_table WHERE PRI_ID = '%d';" % item[7])
        if len(found_user) != 1:
            get_data_from_orig_db("DELETE FROM userinfo_table WHERE PRI_ID = " + str(item[0]) + ";")

def user_move():
    clean_user()
    orig_users = get_data_from_orig_db("SELECT * FROM userinfo_table;")
    for single_user in orig_users:
        company_name = ""
        comp_result = get_data_from_orig_db("SELECT * FROM company_table WHERE PRI_ID = " + str(single_user[7]) + ";")
        if (len(comp_result) == 1):
            company_name = comp_result[0][1]
        else:
            continue
        req = {
            "name":single_user[1],
            "phone_code":single_user[3],
            "open_id_code":single_user[4],
            "email":single_user[6],
            "company_name":company_name,
        }
        user_token = req_to_server('/rbac/fetch_user', req)["token"]
        new_comp = get_data_from_cur_db("select * from company where name = '%s'" % company_name);
        new_comp_id = 0
        if (len(new_comp) == 1):
            new_comp_id = new_comp[0][0]
        else:
            continue
        if single_user[5] == 0:
            req = {
                "company_id": new_comp_id,
                "name":single_user[1],
                "phone":single_user[3],
            }
            req_to_server('/rbac/reg_company_admin', req)
            role_id = req_to_server('/rbac/role_get_all', {}, user_token)["all_role"][0]["id"]
            all_modules = [2,3,4,5,6,7,8,9,10]
            for single_module in all_modules:
                req = {
                    "role_id":role_id,
                    "module_id":single_module,
                }
                req_to_server('/rbac/bind_module2role', req)
def clean_stuff_sql():
    all_stuff = get_data_from_orig_db("SELECT * FROM stuff_type_table where saling == 1;")
    for single_stuff in all_stuff:
        company_found = get_data_from_orig_db("SELECT * FROM company_table WHERE PRI_ID = " + str(single_stuff[5]) + ";")
        if len(company_found) != 1:
            get_data_from_orig_db("DELETE FROM stuff_type_table WHERE PRI_ID = " + str(single_stuff[0]) + ";")

def stuff_move():
    clean_stuff_sql()
    orig_stuff = get_data_from_orig_db("SELECT * FROM stuff_type_table where saling == 1;")
    for single_stuff in orig_stuff:
        user_phone = get_data_from_orig_db( "SELECT * FROM userinfo_table WHERE belong_company_ext_key = " + str(single_stuff[5]) + ";")[0][3]
        user_token = login(user_phone)
        req = {
            "comment":single_stuff[4],
            "expect_count":22,
            "name":single_stuff[1],
        }
        stuff_id = req_to_server('/stuff/fetch', req, user_token)["id"]
        req = {
            "comment":'导入',
            "price":single_stuff[2],
            "stuff_id":stuff_id,
            "to_plan":False
        }
        req_to_server('/stuff/change_price', req, user_token)
        req = {
            "stuff_id":stuff_id,
            "need_sc": True if single_stuff[6] == 1 else False
        }
        req_to_server("/stuff/sc_config", req, user_token)

def contract_move():
    orig_contracts = get_data_from_orig_db("SELECT * FROM contract_table;")
    for single_contract in orig_contracts:
        buy_company_name = get_data_from_orig_db("SELECT * FROM company_table WHERE PRI_ID = " + str(single_contract[5]) + ";")[0][1];
        sale_company_found = get_data_from_orig_db("SELECT * FROM company_table WHERE PRI_ID = " + str(single_contract[6]) + ";")
        if (len(sale_company_found) != 1):
            continue
        user_phone = get_data_from_orig_db( "SELECT * FROM userinfo_table WHERE belong_company_ext_key = " + str(single_contract[6]) + ";")[0][3]
        customer_id = get_data_from_cur_db("SELECT * FROM company WHERE name = '%s';" % buy_company_name)[0][0]
        user_token = login(user_phone)
        resp = req_to_server('/contract/make', {
            "customer_id":customer_id,
            "begin_time":single_contract[1],
            "end_time":single_contract[2],
            "number":single_contract[3],
            "customer_code":single_contract[7],
        }, user_token)["contract_id"]
        contract_id = resp
        try:
            customer_user_old_id = get_data_from_orig_db( "SELECT * FROM contract_user_table WHERE belong_contract_ext_key = " + str(single_contract[0]) + ";")[0][2]
            customer_user_phone = get_data_from_orig_db( "SELECT * FROM userinfo_table WHERE PRI_ID = " + str(customer_user_old_id) + ";")[0][3]
            req_to_server('/contract/authorize', {
                "phone":customer_user_phone,
                "contract_id":contract_id,
            }, user_token)
            req_to_server('/contract/charge', {
                "cash_increased":single_contract[8],
                "comment":'导入',
                "contract_id":contract_id,
            }, user_token)
        except:
            pass
        focus_stuffs = get_data_from_orig_db("SELECT * FROM company_follow_table WHERE follower_ext_key = " + str(single_contract[5]) + ";")
        for single_stuff in focus_stuffs:
            try:
                old_stuff = get_data_from_orig_db("SELECT * FROM stuff_type_table WHERE PRI_ID = " + str(single_stuff[1]) + ";")[0][1]
                sales_id = get_data_from_cur_db("SELECT * FROM company WHERE name = '%s';" % sale_company_found[0][1])[0][0]
                stuff_id = get_data_from_cur_db("SELECT * FROM stuff WHERE name = '%s' AND companyId == %d;" % (old_stuff, sales_id))[0][0]
                req_to_server('/contract/add_stuff', {
                    "contract_id":contract_id,
                    "stuff_id":stuff_id,
                }, user_token)
            except:
                pass

def clean_old_order():
    plans = get_data_from_orig_db(
        "SELECT * FROM plan_table where plan_time NOT LIKE "
        "'2024-%' OR plan_time LIKE '2024-01-%' OR plan_time "
        "LIKE '2024-02-%' OR plan_time LIKE '2024-04-%' OR plan_time LIKE 2024-04-0%;"
    )
    for single_plan in plans:
        get_data_from_orig_db("DELETE FROM plan_table WHERE PRI_ID = " + str(single_plan[0]) + ";")

def move_closed_plans():
    plans = get_data_from_orig_db("SELECT * FROM plan_table where status == 4;")
    for single_plan in plans:
        try:
            ar_plan = get_data_from_orig_db("select * from archive_plan_table where PRI_ID == %d;" % single_plan[9])[0]
            ar_single_vehicles = get_data_from_orig_db("select * from archive_vichele_plan_table where belong_plan_ext_key == %d AND finish == 1;" % ar_plan[0])
            for single_v in ar_single_vehicles:
                try:
                    bvid = req_to_server('/vehicle/fetch', {
                        "plate": single_v[1]
                    })["id"]
                    mvid = req_to_server('/vehicle/fetch', {
                        "plate": single_v[2]
                    })["id"]
                    did = req_to_server('/driver/fetch', {
                        "name": single_v[3],
                        "phone": single_v[4]
                    })["id"]
                    sale_id = get_data_from_cur_db("select * from company where name == '%s';" % (ar_plan[9]))[0][0]
                    buy_id = get_data_from_cur_db("select * from company where name == '%s';" % (ar_plan[10]))[0][0]
                    old_sale_id = get_data_from_orig_db("select * from company_table where name == '%s';" % (ar_plan[9]))[0][0]
                    old_buy_id = get_data_from_orig_db("select * from company_table where name == '%s';" % (ar_plan[10]))[0][0]
                    user_phone = get_data_from_orig_db( "SELECT * FROM userinfo_table WHERE name == '%s' AND belong_company_ext_key = %d" % (ar_plan[3], old_buy_id))[0][3]
                    user_token = login(user_phone)
                    sid = get_data_from_cur_db("select * from stuff where name == '%s' AND companyId == %d;" % (ar_plan[4], sale_id))[0][0]
                    create_req = {
                        "behind_vehicle_id": bvid,
                        "comment": "导入",
                        "driver_id": did,
                        "drop_address": single_v[5],
                        "main_vehicle_id": mvid,
                        "plan_time": ar_plan[8][0:10],
                        "stuff_id": sid,
                        "use_for": single_v[6]
                    }
                    sale_phone = get_data_from_orig_db( "SELECT * FROM userinfo_table WHERE belong_company_ext_key = " + str(old_sale_id)+ ";")[0][3]
                    sale_token = login(sale_phone)
                    plan_id = req_to_server('/plan/create_single_plan', create_req, user_token)["id"]
                    old_price = ar_plan[6]
                    get_data_from_cur_db("update plan set unit_price = 0 where id == %d;" % plan_id)
                    req_to_server('/plan/confirm_single_plan', {
                        "plan_id": plan_id
                    }, sale_token)
                    contract = get_data_from_cur_db("select * from contract where buyCompanyId = %d AND saleCompanyId = %s;" % (buy_id, sale_id))[0][0]
                    req_to_server('/contract/charge', {
                        "cash_increased": float(old_price) * float(single_v[7]),
                        "comment": "导入计划预存",
                        "contract_id": contract
                    }, sale_token)
                    req_to_server('/plan/deliver', {
                        "plan_id": plan_id,
                        "count": float( single_v[7]),
                        "m_time":single_v[9],
                        "m_weight":float( single_v[12]),
                        "p_time":single_v[13],
                        "p_weight": float(single_v[11]),
                    }, sale_token)
                except:
                    traceback.print_exc()
                    continue
        except:
            traceback.print_exc()
            continue


def order_move():
    clean_old_order()
    move_closed_plans()

def sc_config_move():
    old_sc_configs = get_data_from_orig_db("select * from license_require_table;")
    for sc_config in  old_sc_configs:
        try:
            user_phone = get_data_from_orig_db( "SELECT * FROM userinfo_table WHERE belong_company_ext_key = " + str(sc_config[5]) + ";")[0][3]
            user_token = login(user_phone)
            method_input = False
            method_attach = False
            if ('0' in sc_config[4]):
                method_attach = True
            if ('1' in sc_config[4]):
                method_input = True
            need_expired = True
            if (len(sc_config) == 7 and 1 == sc_config[6]):
                need_expired = False
            stuff_info = req_to_server('/stuff/fetch', {"name": 'LNG'}, user_token)
            req = {
                "belong_type": sc_config[3],
                "name": sc_config[1],
                "need_attach": method_attach,
                "need_expired": need_expired,
                "need_input": method_input,
                "stuff_id": stuff_info["id"],
                "prompt":sc_config[2],
            }
            req_to_server('/sc/fetch_req', req, user_token)
        except:
            traceback.print_exc()
            continue

def sc_move():
    sc_config_move()

def main():
    prepare_api()
    move_stage = sys.argv[1]
    if ('all' == move_stage):
        company_move()
        user_move()
        stuff_move()
        contract_move()
        order_move()
    else:
        eval(move_stage + '_move')()

if __name__ == '__main__':
    main()