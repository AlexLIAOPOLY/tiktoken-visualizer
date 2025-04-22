#!/usr/bin/env python3
"""
Tiktoken Visualizer Startup Script (Python Version)
This script creates a virtual environment, installs dependencies, and launches the application
"""

import os
import sys
import subprocess
import time
import platform
import venv
import re
import shutil
import tempfile
import socket
import webbrowser
from pathlib import Path
import atexit
import signal

# 颜色设置
class Colors:
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    RED = '\033[0;31m'
    NC = '\033[0m'  # No color

# 虚拟环境目录
VENV_DIR = "tiktoken_env"

# 所需Python依赖
DEPENDENCIES = ["tiktoken==0.5.1", "flask", "flask-cors", "regex", "numpy", "scikit-learn"]

# 打印彩色文本
def print_color(text, color):
    print(f"{color}{text}{Colors.NC}")

# 执行命令并返回输出
def run_command(cmd, shell=True, env=None):
    try:
        result = subprocess.run(cmd, shell=shell, check=True, capture_output=True, text=True, env=env)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print_color(f"Error executing command: {cmd}", Colors.RED)
        print_color(f"Error details: {e.stderr}", Colors.RED)
        return None

# 检查端口是否在使用中
def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

# 检查Python是否已安装
def check_python():
    try:
        version = sys.version.split()[0]
        print_color(f"Python {version} found", Colors.GREEN)
        return True
    except Exception:
        print_color("Error: Python3 not found. Please install Python 3.x", Colors.RED)
        return False

# 创建虚拟环境
def create_virtual_env():
    if os.path.exists(VENV_DIR):
        print_color("Virtual environment found", Colors.GREEN)
        return True
    
    print_color("Virtual environment not found, creating...", Colors.YELLOW)
    try:
        venv.create(VENV_DIR, with_pip=True)
        print_color("Virtual environment created successfully!", Colors.GREEN)
        return True
    except Exception as e:
        print_color(f"Unable to create virtual environment: {e}", Colors.RED)
        return False

# 获取虚拟环境的激活脚本路径
def get_activate_script():
    if platform.system() == "Windows":
        return os.path.join(VENV_DIR, "Scripts", "activate")
    else:
        return os.path.join(VENV_DIR, "bin", "activate")

# 获取虚拟环境的Python和pip路径
def get_venv_executables():
    if platform.system() == "Windows":
        python = os.path.join(VENV_DIR, "Scripts", "python.exe")
        pip = os.path.join(VENV_DIR, "Scripts", "pip.exe")
    else:
        python = os.path.join(VENV_DIR, "bin", "python")
        pip = os.path.join(VENV_DIR, "bin", "pip")
    
    return python, pip

# 安装依赖项
def install_dependencies():
    python, pip = get_venv_executables()
    
    print_color("Installing required Python dependencies...", Colors.YELLOW)
    
    # 升级pip
    run_command(f'"{pip}" install --upgrade pip')
    
    # 安装所有依赖
    for dep in DEPENDENCIES:
        print_color(f"Installing {dep}...", Colors.YELLOW)
        result = run_command(f'"{pip}" install {dep}')
        if result is None:
            return False
    
    print_color("All dependencies installed!", Colors.GREEN)
    return True

# 处理导入冲突
def handle_import_conflicts():
    temp_name = None
    tiktoken_dir = Path("tiktoken")
    
    if tiktoken_dir.is_dir():
        print_color("Local tiktoken directory detected, may cause import conflicts", Colors.YELLOW)
        choice = input("Temporarily rename to avoid conflicts? (y/n): ")
        
        if choice.lower() in ['y', 'yes']:
            temp_name = f"tiktoken_temp_{int(time.time())}"
            shutil.move("tiktoken", temp_name)
            print_color(f"Renamed tiktoken directory to {temp_name}", Colors.GREEN)
    
    return temp_name

# 恢复原始名称
def restore_tiktoken(temp_name):
    if temp_name and os.path.exists(temp_name):
        if os.path.exists("tiktoken"):
            backup_name = f"tiktoken_backup_{int(time.time())}"
            print_color(f"tiktoken directory already exists, renaming it to {backup_name}", Colors.YELLOW)
            shutil.move("tiktoken", backup_name)
        
        shutil.move(temp_name, "tiktoken")
        print_color(f"Restored {temp_name} to tiktoken", Colors.GREEN)

# 查找一个可用的端口
def find_available_port(start=8080, end=8100):
    for port in range(start, end):
        if not is_port_in_use(port):
            return port
    
    print_color(f"Unable to find an available port between {start} and {end-1}", Colors.RED)
    return None

# 获取服务器端口
def get_server_port(log_file, default=8080):
    # 等待日志文件出现并包含端口信息
    timeout = 10
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        if os.path.exists(log_file):
            try:
                with open(log_file, 'r') as f:
                    content = f.read()
                    match = re.search(r"Server started on port (\d+)", content)
                    if match:
                        return int(match.group(1))
            except Exception:
                pass
        
        time.sleep(0.5)
    
    return default

# 主函数
def main():
    print_color("==================================", Colors.BLUE)
    print_color("  Tiktoken Visualizer Setup Tool  ", Colors.BLUE)
    print_color("==================================", Colors.BLUE)
    
    # 检查Python
    if not check_python():
        sys.exit(1)
    
    # 创建虚拟环境
    if not create_virtual_env():
        sys.exit(1)
    
    # 安装依赖
    if not install_dependencies():
        sys.exit(1)
    
    # 处理导入冲突
    temp_name = handle_import_conflicts()
    if temp_name:
        # 注册退出时恢复原始名称
        atexit.register(restore_tiktoken, temp_name)
        # 注册信号处理器
        signal.signal(signal.SIGINT, lambda sig, frame: sys.exit(0))
    
    # 检查浏览器打开工具
    browser_cmd = None
    if webbrowser.get():
        browser_cmd = "available"
    
    if not browser_cmd:
        print_color("Warning: Cannot find command to open browser automatically, please visit http://localhost:8080 manually", Colors.YELLOW)
    
    # 准备启动应用程序
    print_color("Starting Tiktoken Visualizer...", Colors.BLUE)
    
    log_file = "app_output.log"
    python, _ = get_venv_executables()
    
    # 在子进程中启动应用程序
    process = subprocess.Popen(
        f'"{python}" app.py > {log_file} 2>&1',
        shell=True
    )
    
    # 等待服务器启动
    print_color("Waiting for server to start...", Colors.YELLOW)
    time.sleep(3)
    
    # 获取服务器端口
    port = get_server_port(log_file)
    
    # 打开浏览器
    if browser_cmd:
        print_color("Opening application in browser...", Colors.GREEN)
        webbrowser.open(f"http://localhost:{port}")
    
    # 显示状态信息
    print_color("--------------------------------------------------", Colors.BLUE)
    print_color("Tiktoken Visualizer launched in virtual environment!", Colors.GREEN)
    print_color(f"Backend server address: http://localhost:{port}", Colors.YELLOW)
    print_color(f"Virtual environment: {VENV_DIR}", Colors.YELLOW)
    print_color("Press Ctrl+C to stop the server", Colors.YELLOW)
    print_color("--------------------------------------------------", Colors.BLUE)
    
    # 等待子进程结束
    try:
        process.wait()
    except KeyboardInterrupt:
        # 处理Ctrl+C
        print_color("\nStopping server...", Colors.YELLOW)
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
        print_color("Server stopped", Colors.GREEN)

if __name__ == "__main__":
    main() 