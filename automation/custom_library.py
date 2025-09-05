# custom_library.py
from datetime import datetime
import threading
import requests
import time

def filter_lines_by_time(lines, target_time):
    target_time = datetime.strptime(target_time, "%Y-%m-%d %H:%M:%S")
    print(target_time)
    print(lines[0].split('|'))
    filtered_lines = [line for line in lines if '|' in line and datetime.strptime(line.split('|')[0], "%Y-%m-%d %H:%M:%S") > target_time]
    return filtered_lines

def send_parallel_requests(url, headers, body):
    """
    并行发送两个相同的 HTTP POST 请求
    """
    results = []

    def send_request():
        try:
            response = requests.post(url, headers=headers, json=body)
            results.append(response.json())
        except Exception as e:
            results.append({"error": str(e)})

    # 创建两个线程并行发送请求
    thread1 = threading.Thread(target=send_request)
    thread2 = threading.Thread(target=send_request)
    thread3 = threading.Thread(target=send_request)
    thread4 = threading.Thread(target=send_request)
    thread5 = threading.Thread(target=send_request)
    thread6 = threading.Thread(target=send_request)
    thread7 = threading.Thread(target=send_request)
    thread8 = threading.Thread(target=send_request)
    thread9 = threading.Thread(target=send_request)
    thread10 = threading.Thread(target=send_request)
    thread11 = threading.Thread(target=send_request)
    thread12 = threading.Thread(target=send_request)
    thread13 = threading.Thread(target=send_request)
    thread14 = threading.Thread(target=send_request)
    thread15 = threading.Thread(target=send_request)
    thread16 = threading.Thread(target=send_request)
    thread17 = threading.Thread(target=send_request)
    thread18 = threading.Thread(target=send_request)
    thread19 = threading.Thread(target=send_request)
    thread20 = threading.Thread(target=send_request)

    # 启动线程
    thread1.start()
    thread2.start()
    thread3.start()
    thread4.start()
    thread5.start()
    thread6.start()
    thread7.start()
    thread8.start()
    thread9.start()
    thread10.start()
    thread11.start()
    thread12.start()
    thread13.start()
    thread14.start()
    thread15.start()
    thread16.start()
    thread17.start()
    thread18.start()
    thread19.start()
    thread20.start()
    # 等待线程完成
    thread1.join()
    thread2.join()
    thread3.join()
    thread4.join()
    thread5.join()
    thread6.join()
    thread7.join()
    thread8.join()
    thread9.join()
    thread10.join()
    thread11.join()
    thread12.join()
    thread13.join()
    thread14.join()
    thread15.join()
    thread16.join()
    thread17.join()
    thread18.join()
    thread19.join()
    thread20.join()
    return results
