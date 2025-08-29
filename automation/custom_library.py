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

    # 启动线程
    thread1.start()
    thread2.start()

    # 等待线程完成
    thread1.join()
    thread2.join()

    return results
