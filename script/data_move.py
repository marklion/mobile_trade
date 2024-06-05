#!/usr/bin/python3
import sqlite3
import requests
import sys
import time
import traceback
from datetime import datetime, timedelta

admin_token = ""
orig_db_path = ""
cur_db_path = ""
debug_flag = False
sql_count_total = 0
move_begin_date = "2024-04-15"

def sql_query_from_db(conn, sql, is_insert = False):
    global debug_flag
    global sql_count_total
    sql_count_total += 1
    if debug_flag:
        print(sql)
    try:
        cursor = conn.cursor()
        cursor.execute(sql)
        if (is_insert):
            cursor.execute("select last_insert_rowid();")
        rows = cursor.fetchall()
    except:
        traceback.print_exc()
        print("Error in sql: %s" % sql)
        raise
    return rows
db_con = {}
def get_con_by_db(db_path):
    global db_con
    if db_path not in db_con.keys():
        db_con[db_path] = sqlite3.connect(db_path, isolation_level=None)
    return db_con[db_path]
def query_on_orig_db(sql, is_insert = False):
    global orig_db_path
    conn = get_con_by_db(orig_db_path)
    return sql_query_from_db(conn, sql, is_insert)
def query_on_cur_db(sql, is_insert = False):
    global cur_db_path
    conn = get_con_by_db(cur_db_path)
    return sql_query_from_db(conn, sql, is_insert)
def get_data_from_orig_table(table_name, cond = 'PRI_ID != 0'):
    data = query_on_orig_db("SELECT * FROM %s where %s" % (table_name, cond))
    strc = query_on_orig_db("PRAGMA table_info(%s);" % table_name)
    ret = []
    for item in data:
        single = {}
        for st_def in strc:
            single[st_def[1]] = item[st_def[0]]
        ret.append(single)
    return ret;
def get_data_from_cur_table(table_name, cond = 'id != 0'):
    data = query_on_cur_db("SELECT * FROM %s where %s" % (table_name, cond))
    strc = query_on_cur_db("PRAGMA table_info(%s);" % table_name)
    ret = []
    for item in data:
        single = {}
        for st_def in strc:
            single[st_def[1]] = item[st_def[0]]
        ret.append(single)
    return ret;
def insert_new2cur_table(table_name, data):
    ret = 0
    cur_time_str = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    cols = []
    values = []
    for key in data:
        cols.append(key)
        tmp_value = data[key]
        if type(tmp_value) == type("string"):
            tmp_value = tmp_value.replace("'", "\\'")
            values.append("'" + tmp_value +"'")
        elif tmp_value is not None:
            values.append(str(tmp_value))
        else:
            values.append("''")
    sql = "INSERT INTO %s (%s, createdAt, updatedAt) VALUES (%s,'%s','%s');" % (table_name, ','.join(cols), ','.join(values), cur_time_str,cur_time_str)
    ret = (query_on_cur_db(sql, True))[0][0]
    return ret;

def clean_company():
    records = query_on_orig_db("SELECT * FROM company_table;")
    for item in records:
        if "内蒙古中能天然气有限公司" == item[1]:
            continue
        found_contract = query_on_orig_db("SELECT * FROM contract_table WHERE a_side_ext_key = '%d' OR b_side_ext_key = '%d';" % (item[0], item[0]))
        if len(found_contract) == 0:
            query_on_orig_db("DELETE FROM company_table WHERE PRI_ID = " + str(item[0]) + ";")

def company_module_role(ocid, ncid, is_sale):
    orig_bi = get_data_from_orig_table('base_info_table', 'belong_company_ext_key == %d'  % ocid)
    for bi in orig_bi:
        new_bi = {
            'name':bi['name'],
            'base_id':bi['id'],
            'companyId':ncid,
            'unit':bi['unit'],
            'type':bi['type'],
            'code':bi['code'],
            'pid':bi['pid'],
        }
        insert_new2cur_table('hd_base_info', new_bi)
    common_module = {
        'companyId':ncid
    }
    orig_buy_mod = [2, 11]
    orig_sale_mod = [3,4,5,6,7,8,9,10]
    if is_sale:
        df_role = {
            'name':'企业管理员角色',
            'description':'企业管理员角色',
            'companyId':ncid,
        }
        role_id = insert_new2cur_table('rbac_role', df_role)
        for mod in orig_sale_mod:
            common_module['rbacModuleId'] = mod
            insert_new2cur_table('company_module', common_module)
            mod_role = {
                "rbacRoleId":role_id,
                'rbacModuleId':mod
            }
            insert_new2cur_table('rbac_role_module', mod_role)
    else:
        df_role = {
            'name':'普通角色',
            'description':'普通角色',
            'companyId':ncid,
        }
        role_id = insert_new2cur_table('rbac_role', df_role)
        for mod in orig_buy_mod:
            common_module['rbacModuleId'] = mod
            insert_new2cur_table('company_module', common_module)
            mod_role = {
                "rbacRoleId":role_id,
                'rbacModuleId':mod
            }
            insert_new2cur_table('rbac_role_module', mod_role)

def clean_buy_order():
    global move_begin_date
    query_on_orig_db('delete from vichele_stay_alone_table where datetime(timestamp) < datetime("%s");' % move_begin_date)

def company_move():
    clean_company()
    clean_buy_order()
    old_companies = get_data_from_orig_table('company_table');
    for item in old_companies:
        new_data = {
            "name": item['name'],
            'script':'normal',
            'address':item['address'],
            'contact':item['contact'],
            'attachment':item['attachment_picture'],
            'third_key':item['third_key'],
            'third_url':item['third_url'],
            'third_token':item['third_token'],
            'stamp_pic':item['stamp_pic'],
            'zc_url':item['zc_url'],
            'zh_ssid':item['zh_ssid'],
            'event_types':item['event_types'],
            'remote_event_url':item['remote_event_url'],
            'driver_notice':item['driver_notice'],
            'notice':item['notice'],
            'zc_rpc_url':item['zc_rpc_url'],
            'zczh_back_end':item['zczh_back_end'],
            'zczh_back_token':item['zczh_back_token'],
        }
        company_id = insert_new2cur_table('company', new_data)
        company_module_role(item['PRI_ID'], company_id, item['is_sale'] == 1)
    obcs = get_data_from_orig_table('vichele_stay_alone_table', 'is_drop != 1 AND company_name != "" group by company_name')
    for item in obcs:
        try:
            new_data = {
                'name':item['company_name'],
                'script':'normal',
            }
            company_id = insert_new2cur_table('company', new_data)
            company_module_role(0, company_id, False)
        except:
            traceback.print_exc()
            continue
    obcs = get_data_from_orig_table('vichele_stay_alone_table', 'is_drop != 1 AND transfor_company != "" group by transfor_company')
    for item in obcs:
        try:
            new_data = {
                'name':item['transfor_company'],
                'script':'normal',
            }
            company_id = insert_new2cur_table('company', new_data)
            company_module_role(0, company_id, False)
        except:
            traceback.print_exc()
            continue

    orig_sups = get_data_from_orig_table('supplier_basic_info_table', "belong_company_ext_key == 2")
    for item in orig_sups:
        try:
            new_data = {
                'name':item['name'],
                'script':'normal',
            }
            company_id = insert_new2cur_table('company', new_data)
            company_module_role(0, company_id, False)
        except:
            traceback.print_exc()
            continue


def api_user_move():
    orig_api_users = get_data_from_orig_table('api_user_table')
    for single_user in orig_api_users:
        try:
            company_name = query_on_orig_db('select name from company_table where PRI_ID == %d'%single_user['belong_company_ext_key'])[0][0]
            new_company_id = query_on_cur_db('select id from company where name == "%s"'%company_name)[0][0]
            item = {
                'name':single_user['email'],
                'online_token':single_user['token'],
                'fixed':1,
                'phone':single_user['email'],
                'companyId':new_company_id
            }
            user_id = insert_new2cur_table('rbac_user', item)
            role_id = query_on_cur_db('select id from rbac_role where companyId == %d' % new_company_id)[0][0]
            user_role = {
                "rbacUserId":user_id,
                'rbacRoleId':role_id
            }
            insert_new2cur_table('rbac_user_role', user_role)
        except:
            traceback.print_exc()


def clean_user():
    records = query_on_orig_db("SELECT * FROM userinfo_table;")
    for item in records:
        found_user = query_on_orig_db("SELECT * FROM company_table WHERE PRI_ID = '%d';" % item[7])
        if len(found_user) != 1:
            query_on_orig_db("DELETE FROM userinfo_table WHERE PRI_ID = " + str(item[0]) + ";")

def clean_stuff_sql():
    all_stuff = query_on_orig_db("SELECT * FROM stuff_type_table where saling == 1;")
    for single_stuff in all_stuff:
        company_found = query_on_orig_db("SELECT * FROM company_table WHERE PRI_ID = " + str(single_stuff[5]) + ";")
        if len(company_found) != 1:
            query_on_orig_db("DELETE FROM stuff_type_table WHERE PRI_ID = " + str(single_stuff[0]) + ";")
def vehicle_driver_move():
    mvs = get_data_from_orig_table('vichele_table', 'is_drop != 1 AND number != "" AND number NOT LIKE "%挂" group by number;')
    for sv in mvs:
        new_v = {
            'plate':sv['number'],
        }
        insert_new2cur_table('vehicle', new_v)
    bvs = get_data_from_orig_table('vichele_behind_table', 'is_drop != 1 AND number != "" AND number LIKE "%挂" group by number;')
    for sv in bvs:
        new_v = {
            'plate':sv['number'],
            'is_behind':1
        }
        insert_new2cur_table('vehicle', new_v)
    drs = get_data_from_orig_table('driver_table', 'is_drop != 1 AND phone != "" group by phone;')
    for sd in drs:
        new_d = {
            'name':sd['name'],
            'phone':sd['phone'],
            'id_card':sd['driver_id'],
        }
        insert_new2cur_table('driver', new_d)
    vsat = get_data_from_orig_table('vichele_stay_alone_table', 'is_drop != 1 AND main_vichele_number != "" AND main_vichele_number NOT LIKE "%挂" group by main_vichele_number;')
    for sv in vsat:
        new_v = {
            'plate':sv['main_vichele_number'],
        }
        try:
            insert_new2cur_table('vehicle', new_v)
        except:
            traceback.print_exc()
            continue
    vsat = get_data_from_orig_table('vichele_stay_alone_table', 'is_drop != 1 AND behind_vichele_number != "" AND behind_vichele_number LIKE "%挂" group by behind_vichele_number;')
    for sv in vsat:
        new_v = {
            'plate':sv['behind_vichele_number'],
            'is_behind':1
        }
        try:
            insert_new2cur_table('vehicle', new_v)
        except:
            traceback.print_exc()
            continue
    vsat = get_data_from_orig_table('vichele_stay_alone_table', 'is_drop != 1 AND driver_phone != "" group by driver_phone;')
    for sv in vsat:
        try:
            new_d = {
            'name':sv['driver_name'],
            'phone':sv['driver_phone'],
            'id_card':sv['driver_id'],
            }
            insert_new2cur_table('driver', new_d)
        except:
            traceback.print_exc()
            continue
    insert_new2cur_table('vehicle', {'plate':'', 'is_behind':1})
def user_move():
    obusers = get_data_from_orig_table('vichele_stay_alone_table', 'is_drop != 1 group by created_by_ext_key')
    for item in obusers:
        try:
            ou = get_data_from_orig_table('silent_user_table', 'PRI_ID == %d' % item['created_by_ext_key'])[0]
            ocn = item['company_name']
            if item['transfor_company'] != "":
                ocn = item['transfor_company']
            nc = get_data_from_cur_table('company', 'name == "%s"' % ocn)[0]
            nu = {
                'name':ou['name'],
                'phone':ou['phone'],
                'companyId':nc['id']
            }
            nu_id = insert_new2cur_table('rbac_user', nu)
            role = get_data_from_cur_table('rbac_role', 'companyId == %d' % nc['id'])[0]
            user_role = {
                'rbacUserId':nu_id,
                'rbacRoleId':role['id']
            }
            insert_new2cur_table('rbac_user_role', user_role)
        except:
            traceback.print_exc()
            continue
    clean_user()
    orig_users = get_data_from_orig_table('userinfo_table', 'phone != "" AND phone != "18911992582" order by PRI_ID DESC')
    for item in orig_users:
        try:
            oc = get_data_from_orig_table('company_table', 'PRI_ID == %d' % item['belong_company_ext_key'])[0]
            nc = get_data_from_cur_table('company', 'name == "%s"' % oc['name'])[0]
            nu = {
                'name':item['name'],
                'phone':item['phone'],
                'password':'',
                'email':item['email'],
                'companyId': nc['id']
            }
            nu_id = insert_new2cur_table('rbac_user', nu)
            role = get_data_from_cur_table('rbac_role', 'companyId == %d' % nc['id'])[0]
            user_role = {
                'rbacUserId':nu_id,
                'rbacRoleId':role['id']
            }
            insert_new2cur_table('rbac_user_role', user_role)

        except:
            traceback.print_exc()
            continue


def stuff_move():
    clean_stuff_sql()
    orig_stuff = get_data_from_orig_table('stuff_type_table', 'saling == 1')
    for item in orig_stuff:
        orig_company = get_data_from_orig_table('company_table', 'PRI_ID == %d' % item['belong_company_ext_key'])[0]
        nc = get_data_from_cur_table('company', 'name == "%s"' % orig_company['name'])[0]
        ns = {
            'name':item['name'],
            'price':item['price'],
            'comment':item['last'],
            'expect_count':22,
            'need_sc':item['need_seck_check'],
            'companyId':nc['id']
        }
        st_id = insert_new2cur_table('stuff', ns)
        bidding_move(st_id, item['PRI_ID'])
    bs = get_data_from_orig_table('vichele_stay_alone_table', 'is_drop != 1 group by stuff_name')
    for item in bs:
        try:
            exp_exist = get_data_from_orig_table('except_stuff_table', 'name == "%s"' % item['stuff_name'])
            need_enter_weight = 1
            if len(exp_exist) > 0:
                need_enter_weight = 0
            orig_company = get_data_from_orig_table('company_table', 'PRI_ID == %d' % item['destination_ext_key'])[0]
            nc = get_data_from_cur_table('company', 'name == "%s"' % orig_company['name'])[0]
            ns = {
                'name':item['stuff_name'],
                'companyId':nc['id'],
                'use_for_buy':1,
                'need_enter_weight':need_enter_weight,
                'no_need_register':1,
            }
            st_id = insert_new2cur_table('stuff', ns)
        except:
            traceback.print_exc()
            continue

    orig_sups = get_data_from_orig_table('supplier_basic_info_table', "belong_company_ext_key == 2 group by bound_stuff")
    for item in orig_sups:
        try:
            ns = {
                'name':item['bound_stuff'],
                'companyId':1,
                'use_for_buy':1,
                'need_enter_weight':need_enter_weight,
                'no_need_register':1,
            }
            st_id = insert_new2cur_table('stuff', ns)
        except:
            traceback.print_exc()
            continue


def sc_req_move():
    orig_lrs = get_data_from_orig_table('license_require_table')
    for item in orig_lrs:
        try:
            need_attach = 0
            need_input = 0
            need_expired = 1
            if '0' in item['input_method']:
                need_attach = 1
            if '1' in item['input_method']:
                need_input = 1
            if item['ltv'] == 1:
                need_expired = 0
            orig_company = get_data_from_orig_table('company_table', 'PRI_ID == %d' % item['belong_company_ext_key'])[0]
            new_company = get_data_from_cur_table('company', 'name == "%s"' % orig_company['name'])[0]
            LNG_stuff = get_data_from_cur_table('stuff', 'name == "LNG" AND companyId == %d' % new_company['id'])[0]
            nsr = {
                'name':item['name'],
                'need_attach':need_attach,
                'need_input':need_input,
                'need_expired':need_expired,
                'prompt':item['prompt'],
                'stuffId':LNG_stuff['id'],
            }
            sc_id = insert_new2cur_table('sc_req', nsr)
            sc_content_move(item['PRI_ID'], sc_id)
        except:
            traceback.print_exc()
            continue
def sc_content_move(osc_id, nsc_id):
    os_contents = get_data_from_orig_table('sec_check_data_table', 'belong_lr_ext_key == %d' % osc_id)
    cur_time_str = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    for item in os_contents:
        related_driver = get_data_from_cur_table('driver', 'phone == "%s"' % item['related_info'])
        related_vehicle = get_data_from_cur_table('vehicle', 'plate == "%s"' % item['related_info'])
        ns_content = {
            'expired_time':item['expired_date'],
            'attachment':item['attachment_path'],
            'input':item['input_content'],
            'passed':item['has_confirmed'],
            'checker':item['confirmer'],
            'comment':item['comment'],
            'check_time':cur_time_str,
            'scReqId':nsc_id,
        }
        if len(related_driver) > 0:
            ns_content['driverId'] = related_driver[0]['id']
        elif len(related_vehicle) > 0:
            ns_content['vehicleId'] = related_vehicle[0]['id']
        insert_new2cur_table('sc_content', ns_content)
def contract_stuff_move():
    orig_stuff_maps = get_data_from_orig_table('company_follow_table')
    for item in orig_stuff_maps:
        try:
            os = get_data_from_orig_table('stuff_type_table', 'PRI_ID == %d' % item['follow_stuff_ext_key'])[0]
            obc = get_data_from_orig_table('company_table', 'PRI_ID == %d' % item['follower_ext_key'])[0]
            osc = get_data_from_orig_table('company_table', 'PRI_ID == %d' % os['belong_company_ext_key'])[0]
            nbc = get_data_from_cur_table('company', 'name == "%s"' % obc['name'])[0]
            nsc = get_data_from_cur_table('company', 'name == "%s"' % osc['name'])[0]
            ncon = get_data_from_cur_table('contract', 'buyCompanyId == %d AND saleCompanyId == %d' % (nbc['id'], nsc['id']))[0]
            ns = get_data_from_cur_table('stuff', 'name == "%s" AND companyId == %d' % (os['name'], nsc['id']))[0]
            new_cs = {
                'contractId':ncon['id'],
                'stuffId':ns['id'],
            }
            insert_new2cur_table('contract_stuff', new_cs)
        except:
            traceback.print_exc()
            continue
    orig_sups = get_data_from_orig_table('supplier_basic_info_table', "belong_company_ext_key == 2")
    for item in orig_sups:
        try:
            ns = get_data_from_cur_table('stuff', 'name == "%s"' % item['bound_stuff'])[0]
            nsc = get_data_from_cur_table('company', 'name == "%s"' % item['name'])[0]
            ncon = get_data_from_cur_table('contract', 'buyCompanyId == 1 AND saleCompanyId == %d' % nsc['id'])[0]
            new_cs = {
                'contractId':ncon['id'],
                'stuffId':ns['id'],
            }
            insert_new2cur_table('contract_stuff', new_cs)
        except:
            traceback.print_exc()
            continue

def contract_user_move(ocid, ncid):
    ocus = get_data_from_orig_table('contract_user_table', 'belong_contract_ext_key == %d' % ocid)
    for item in ocus:
        ouser = get_data_from_orig_table('userinfo_table', 'PRI_ID == %d' % item['belong_user_ext_key'])[0]
        nuser = get_data_from_cur_table('rbac_user', 'phone == "%s"' % ouser['phone'])[0]
        ncu = {
            'rbacUserId':nuser['id'],
            'contractId':ncid
        }
        insert_new2cur_table('user_contract', ncu)
def contract_move():
    octs = get_data_from_orig_table('contract_table')
    cur_time_str = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    for item in octs:
        try:
            obc = get_data_from_orig_table('company_table', 'PRI_ID == %d' % item['a_side_ext_key'])[0]
            osc = get_data_from_orig_table('company_table', 'PRI_ID == %d' % item['b_side_ext_key'])[0]
            nbc = get_data_from_cur_table('company', 'name == "%s"' % obc['name'])[0]
            nsc = get_data_from_cur_table('company', 'name == "%s"' % osc['name'])[0]
            nc = {
                'sign_time':cur_time_str,
                'balance':item['balance'],
                'begin_time':item['start_time'],
                'end_time':item['end_time'],
                'number':item['number'],
                'customer_code':item['customer_code'],
                'buyCompanyId':nbc['id'],
                'saleCompanyId':nsc['id'],
            }
            nc_id = insert_new2cur_table('contract', nc)
            blc_his_move(item['PRI_ID'], nc_id)
            contract_user_move(item['PRI_ID'], nc_id)
        except:
            traceback.print_exc()
            continue
    obcts = get_data_from_orig_table('vichele_stay_alone_table', 'is_drop != 1 group by company_name,destination_ext_key')
    for item in obcts:
        try:
            orig_bc = get_data_from_orig_table('company_table', 'PRI_ID == %d' % item['destination_ext_key'])[0]
            nc = {
                'sign_time':cur_time_str,
                'balance':0,
                'begin_time':cur_time_str,
                'end_time':'2999-12-31',
                'number':'',
                'customer_code':'',
                'buyCompanyId':get_data_from_cur_table('company', 'name == "%s"' % orig_bc['name'])[0]['id'],
                'saleCompanyId':get_data_from_cur_table('company', 'name == "%s"' % item['company_name'])[0]['id'],
            }
            insert_new2cur_table('contract', nc)
            nc['saleCompanyId'] = get_data_from_cur_table('company', 'name == "%s"' % item['transfor_company'])[0]['id']
            insert_new2cur_table('contract', nc)
        except:
            traceback.print_exc()
            continue

    orig_sups = get_data_from_orig_table('supplier_basic_info_table', "belong_company_ext_key == 2")
    for item in orig_sups:
        try:
            nc = {
                'sign_time':cur_time_str,
                'balance':0,
                'begin_time':cur_time_str,
                'end_time':'2999-12-31',
                'number':'',
                'customer_code':'',
                'buyCompanyId':1,
                'saleCompanyId':get_data_from_cur_table('company', 'name == "%s"' % item['name'])[0]['id'],
            }
            exrec = get_data_from_cur_table('contract', 'buyCompanyId == 1 AND saleCompanyId == %d' % nc['saleCompanyId'])
            if len(exrec) > 0:
                continue
            insert_new2cur_table('contract', nc)
        except:
            traceback.print_exc()
            continue
def blc_his_move(oc_id, nc_id):
    orig_bhs = get_data_from_orig_table('balance_history_table', 'belong_contract_ext_key == %d AND datetime(timestamp) > datetime("2024-01-01")' % oc_id)
    prev_item = None
    for item in orig_bhs:
        if prev_item == None:
            prev_item = item
            continue
        nbh = {
            'time':prev_item['timestamp'],
            'operator':prev_item['account'],
            'comment':prev_item['reason'],
            'cash_increased': item['balance_before_change'] - prev_item['balance_before_change'],
            'contractId':nc_id,
        }
        insert_new2cur_table('balance_history', nbh)
        prev_item = item
    if prev_item is not None:
        cur_balance = get_data_from_cur_table('contract', 'id == %d' % nc_id)[0]['balance']
        nbh = {
            'time':prev_item['timestamp'],
            'operator':prev_item['account'],
            'comment':prev_item['reason'],
            'cash_increased': cur_balance - prev_item['balance_before_change'],
            'contractId':nc_id,
        }
        insert_new2cur_table('balance_history', nbh)
def bidding_move(nsid, osid):
    orig_bts = get_data_from_orig_table('bidding_table', 'status == 1 AND bidding_times == 1 AND belong_stuff_ext_key == %d' % osid)
    for item in orig_bts:
        new_bidding = {
            'total':item['total_count'],
            'comment':item['bidding_comment'],
            'min':item['min_price'],
            'max':item['max_price'],
            'total_turn':1,
            'pay_first':0,
            'status': 1,
            'stuffId':nsid,
        }
        bid = insert_new2cur_table('bidding_config', new_bidding)
        orig_turns = get_data_from_orig_table('bidding_turn_table', 'begin_time IS NOT NULL AND belong_bidding_ext_key == %d' % item['PRI_ID'])
        for bt_item in orig_turns:
            new_bt = {
                'finish':1,
                'begin_time':bt_item['begin_time'],
                'end_time':bt_item['end_time'],
                'turn':1,
                'biddingConfigId': bid
            }
            bt_id = insert_new2cur_table('bidding_turn', new_bt)
            orig_bitems = get_data_from_orig_table('bidding_customer_table', 'has_accept = 1 AND timestamp IS NOT NULL AND belong_bidding_turn_ext_key == %d' % bt_item['PRI_ID'])
            for bi in orig_bitems:
                try:
                    orig_user = get_data_from_orig_table('userinfo_table', 'PRI_ID == %d' % bi['call_user_ext_key'])[0]
                    new_user = get_data_from_cur_table('rbac_user', 'phone == "%s"' % orig_user['phone'])[0]
                    new_bi = {
                        'price':bi['price'],
                        'time':bi['timestamp'],
                        'accept':1,
                        'biddingTurnId':bt_id,
                        'rbacUserId':new_user['id']
                    }
                    insert_new2cur_table('bidding_item', new_bi)
                except:
                    traceback.print_exc()
                    continue
def compare_time(time1,time2):
    s_time = time.mktime(time.strptime(time1,'%Y-%m-%d'))
    e_time = time.mktime(time.strptime(time2,'%Y-%m-%d'))
    return int(s_time) - int(e_time)

def real_plan_move():
    global move_begin_date
    orig_plan_vehicles = get_data_from_orig_table('single_vichele_table', 'finish = 0 OR datetime(deliver_timestamp) > datetime("%s")'% move_begin_date)
    for item in orig_plan_vehicles:
        try:
            op = get_data_from_orig_table('plan_table', 'proxy_company == "" AND PRI_ID == %d' % item['belong_plan_ext_key'])[0]
            if compare_time(op['plan_time'][0:10], move_begin_date) < 0:
                continue
            orig_create_user = get_data_from_orig_table('userinfo_table', 'PRI_ID == %d' % op['created_by_ext_key'])[0]
            new_user = get_data_from_cur_table('rbac_user', 'phone == "%s"' % orig_create_user['phone'])[0]
            new_company = get_data_from_cur_table('company', 'id == %d' % new_user['companyId'])[0]
            orig_mv = get_data_from_orig_table('vichele_table', 'PRI_ID == %d' % item['main_vichele_ext_key'])[0]
            orig_bv = get_data_from_orig_table('vichele_behind_table', 'PRI_ID == %d' % item['behind_vichele_ext_key'])[0]
            orig_dr = get_data_from_orig_table('driver_table', 'PRI_ID == %d' % item['driver_ext_key'])[0]
            new_mv = get_data_from_cur_table('vehicle', 'plate == "%s"' % orig_mv['number'])[0]
            new_bv = get_data_from_cur_table('vehicle', 'plate == "%s"' % orig_bv['number'])[0]
            new_dr = get_data_from_cur_table('driver', 'phone == "%s"' % orig_dr['phone'])[0]
            orig_stuff = get_data_from_orig_table('stuff_type_table', 'PRI_ID == %d' % op['belong_stuff_ext_key'])[0]
            orig_sale_com = get_data_from_orig_table('company_table', 'PRI_ID == %d' % orig_stuff['belong_company_ext_key'])[0]
            new_sale_com = get_data_from_cur_table('company', 'name == "%s"' % orig_sale_com['name'])[0]
            new_stuff = get_data_from_cur_table('stuff', 'name == "%s" AND companyId == %d' % (orig_stuff['name'], new_sale_com['id']))[0]
            new_plan = {
                "plan_time": op['plan_time'][0:10],
                "unit_price": op['price'],
                "status": op['status'] - 1,
                'comment':item['comment'],
                'from_bidding':0,
                'count':item['count'],
                'p_weight':item['p_weight'],
                'm_weight':item['m_weight'],
                'p_time':item['deliver_p_timestamp'],
                'm_time':item['deliver_timestamp'],
                'use_for':item['use_for'],
                'drop_address':item['drop_address'],
                'manual_close':0,
                'companyId':new_company['id'],
                'mainVehicleId':new_mv['id'],
                'behindVehicleId':new_bv['id'],
                'driverId':new_dr['id'],
                'stuffId':new_stuff['id'],
                'rbacUserId':new_user['id'],
                'seal_no':item['seal_no'],
                'ticket_no':item['ticket_no'],
                'trans_company_name':op['trans_company_name']
            }
            if item['finish'] == 1 and op['status'] == 3:
                new_plan['status'] = 3
            orig_ck_info = get_data_from_orig_table('driver_register_table', 'belong_vichele_ext_key == %d' % item['PRI_ID'])
            if len(orig_ck_info) > 0:
                new_plan['register_time'] = orig_ck_info[0]['timestamp']
                new_plan['register_number'] = orig_ck_info[0]['number']
                new_plan['register_comment'] = orig_ck_info[0]['enter_location']
            new_pid = insert_new2cur_table('plan', new_plan)
            plan_history_move(op['PRI_ID'], new_pid)
        except:
            traceback.print_exc()
            continue
def plan_history_move(opid, npid):
    ophs = get_data_from_orig_table('plan_status_table', 'belong_plan_ext_key == %d' % opid)
    for item in ophs:
        action_array = ['创建', '确认', '验款', '发车']
        op_user = get_data_from_orig_table('userinfo_table', 'PRI_ID == %d' % item['author_ext_key'])[0]
        nh = {
            'time':item['timestamp'],
            'operator':op_user['name'],
            'action_type': action_array[item['status_index']],
            'planId':npid
        }
        insert_new2cur_table('plan_history', nh)

def dc_move():
    orig_dcs = get_data_from_orig_table('dc_status')
    for item in orig_dcs:
        odc_company = get_data_from_orig_table('company_table', 'PRI_ID == %d' % item['belong_company_ext_key'])[0]
        ndc_company = get_data_from_cur_table('company', 'name == "%s"' % odc_company['name'])[0]
        new_dc = {
            'name':item['name'],
            'mac':item['mac'],
            'status':item['status'],
            'companyId':ndc_company['id']
        }
        insert_new2cur_table('dc_status', new_dc)

def order_move():
    global move_begin_date
    oos = get_data_from_orig_table('vichele_stay_alone_table', 'datetime(date) > datetime("%s")' % move_begin_date)
    for item in oos:
        try:
            ou = get_data_from_orig_table('silent_user_table', 'PRI_ID == %d' % item['created_by_ext_key'])[0]
            status = item['status']
            if status == 2:
                status = 3
            companyId = 0;
            behindVehicleId = 0;
            ocpn = get_data_from_cur_table('company', 'name == "%s"' % item['company_name'])
            obv = get_data_from_cur_table('vehicle', 'plate == "%s"'% item['behind_vichele_number'])
            if len(ocpn) > 0:
                companyId = ocpn[0]['id']
            if len(obv) > 0:
                behindVehicleId = obv[0]['id']
            no = {
                'plan_time':item['date'],
                'unit_price':item['price'],
                'status': status,
                'comment': item['comment'],
                'enter_count': item['count'],
                'enter_attachment':item['attach_path'],
                'p_weight':item['p_weight'],
                'm_weight':item['m_weight'],
                'p_time':item['p_time'],
                'm_time':item['m_time'],
                'is_buy':1,
                'is_repeat':item['is_repeated'],
                'ticket_no':item['ticket_no'],
                'trans_company_name':item['transfor_company'],
                'companyId':companyId,
                'mainVehicleId':get_data_from_cur_table('vehicle', 'plate == "%s"'% item['main_vichele_number'])[0]['id'],
                'behindVehicleId':behindVehicleId,
                'driverId':get_data_from_cur_table('driver', 'phone == "%s"'% item['driver_phone'])[0]['id'],
                'stuffId':get_data_from_cur_table('stuff', 'name == "%s"'% item['stuff_name'])[0]['id'],
                'rbacUserId': get_data_from_cur_table('rbac_user', 'phone == "%s"' % ou['phone'])[0]['id'],
            }
            insert_new2cur_table('plan', no)
        except:
            traceback.print_exc()
            continue

def checkin_move():
    orig_cks = get_data_from_orig_table('driver_register_table')
    for item in orig_cks:
        try:
            ov = get_data_from_orig_table('single_vichele_table', 'PRI_ID == %d' % item['belong_vichele_ext_key'])[0]
        except:
            traceback.print_exc()
            continue

def vehicle_team_move():
    orig_vts = get_data_from_orig_table('vichele_team_table')
    for item in orig_vts:
        try:
            ou = get_data_from_orig_table('userinfo_table', 'PRI_ID == %d' % item['created_by_ext_key'])[0]
            nu = get_data_from_cur_table('rbac_user', 'phone == "%s"' % ou['phone'])[0]
            new_vt = {
                'name':item['name'],
                'team_member':item['team_member'],
                'rbacUserId': nu['id']
            }
            insert_new2cur_table('vehicle_team', new_vt)
        except:
            traceback.print_exc()
            continue

def main():
    global orig_db_path
    global cur_db_path
    global sql_count_total
    global debug_flag
    global move_begin_date

    begin_time = time.time_ns()
    orig_db_path = "/database/pa.db"
    cur_db_path = "/database/mt.db"
    if (len(sys.argv) > 2):
        orig_db_path = sys.argv[2]
    if (len(sys.argv) > 3):
        cur_db_path = sys.argv[3]
    if len(sys.argv) > 4:
        move_begin_date = sys.argv[4]

    if ('all' == sys.argv[1]):
        company_move()
        api_user_move()
        vehicle_driver_move()
        user_move()
        stuff_move()
        contract_move()
        sc_req_move()
        order_move()
        real_plan_move()
        contract_stuff_move()
        dc_move()
        vehicle_team_move()
    else:
        eval(sys.argv[1]+ '_move')()
    end_time = time.time_ns()
    print('total runs %d sql, spend %d s'% (sql_count_total, (end_time - begin_time)/1000000000))
    return

if __name__ == '__main__':
    main()