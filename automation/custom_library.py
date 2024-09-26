# custom_library.py
from datetime import datetime

def filter_lines_by_time(lines, target_time):
    target_time = datetime.strptime(target_time, "%Y-%m-%d %H:%M:%S")
    print(target_time)
    print(lines[0].split('|'))
    filtered_lines = [line for line in lines if '|' in line and datetime.strptime(line.split('|')[0], "%Y-%m-%d %H:%M:%S") > target_time]
    return filtered_lines
