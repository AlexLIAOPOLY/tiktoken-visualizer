#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tiktoken Visualizer 启动脚本 (Python版)
为Mac系统设计的启动脚本，可自动启动后端服务并打开浏览器
"""

import os
import sys
import time
import subprocess
import webbrowser
import signal
import importlib.util
import platform
import shutil
import tempfile

# 全局变量
server_process = None
renamed_folders = []  # 存储临时重命名的文件夹信息，用于恢复

# 确保在Mac系统上运行
if platform.system() != "Darwin":
    print("警告: 此脚本专为Mac系统设计，在其他系统上可能无法正常工作")

def check_dependencies():
    """检查必要的Python依赖是否已安装"""
    required_packages = ["tiktoken", "flask", "flask_cors", "regex"]
    missing_packages = []
    
    for package in required_packages:
        if importlib.util.find_spec(package) is None:
            missing_packages.append(package)
    
    if missing_packages:
        print(f"缺少以下依赖包: {', '.join(missing_packages)}")
        print("\n依赖安装选项:")
        print("1. 使用pip安装 (可能需要--user或--break-system-packages选项)")
        print("2. 使用系统包管理器安装 (如Mac上的brew)")
        print("3. 使用虚拟环境安装 (推荐)")
        print("4. 跳过安装 (如果您已知如何手动安装)")
        
        choice = input("\n请选择安装方式 (1-4): ")
        
        if choice == "1":
            # 尝试使用pip安装
            try:
                # 首先尝试普通安装
                subprocess.check_call([sys.executable, "-m", "pip", "install"] + missing_packages)
                print("依赖安装完成!")
            except subprocess.CalledProcessError:
                # 如果失败，尝试使用--user标志
                print("普通安装失败，尝试使用--user选项...")
                try:
                    subprocess.check_call([sys.executable, "-m", "pip", "install", "--user"] + missing_packages)
                    print("依赖安装完成!")
                except subprocess.CalledProcessError:
                    # 如果仍然失败，建议使用break-system-packages
                    print("安装失败。对于Mac OS系统Python，您可能需要使用以下命令手动安装:")
                    print(f"{sys.executable} -m pip install --break-system-packages " + " ".join(missing_packages))
                    sys.exit(1)
        
        elif choice == "2":
            # 指导使用系统包管理器
            print("\n使用系统包管理器安装:")
            for package in missing_packages:
                if platform.system() == "Darwin":  # macOS
                    print(f"brew install {package.replace('_', '-')}")
            
            print("\n安装后请重新运行此脚本")
            sys.exit(0)
        
        elif choice == "3":
            # 指导使用虚拟环境
            print("\n推荐使用虚拟环境安装依赖:")
            print("\n# 创建虚拟环境")
            print("python3 -m venv tiktoken_env")
            print("\n# 激活虚拟环境")
            if platform.system() == "Windows":
                print("tiktoken_env\\Scripts\\activate")
            else:
                print("source tiktoken_env/bin/activate")
            print("\n# 安装依赖")
            print(f"pip install {' '.join(missing_packages)}")
            print("\n# 使用虚拟环境运行脚本")
            print("python app.py")
            
            print("\n请按照上述步骤创建虚拟环境并安装依赖")
            sys.exit(0)
        
        elif choice == "4":
            print("跳过依赖安装，请确保手动安装所需的依赖")
        
        else:
            print("无效选择，请手动安装依赖后再运行此脚本")
            sys.exit(1)

def resolve_import_conflicts():
    """解决可能的导入冲突问题"""
    # 检查常见的导入冲突
    conflict_dirs = {
        "tiktoken": "需要使用已安装的tiktoken库，而不是本地目录"
    }
    
    current_dir = os.getcwd()
    
    for dirname, description in conflict_dirs.items():
        local_dir = os.path.join(current_dir, dirname)
        if os.path.isdir(local_dir):
            print(f"检测到可能的导入冲突: {dirname} ({description})")
            action = input(f"检测到当前目录有{dirname}文件夹，可能导致导入冲突。是否临时重命名以解决冲突? (y/n): ")
            if action.lower() == 'y':
                # 创建临时文件夹名
                temp_name = f"{dirname}_temp_{int(time.time())}"
                temp_path = os.path.join(current_dir, temp_name)
                
                # 重命名文件夹
                os.rename(local_dir, temp_path)
                renamed_folders.append((local_dir, temp_path))
                print(f"已将 {dirname} 重命名为 {temp_name} 以避免导入冲突")
            else:
                print(f"警告: 未解决{dirname}的导入冲突，可能导致启动失败")

def restore_renamed_folders():
    """恢复之前重命名的文件夹"""
    global renamed_folders
    
    for original_path, temp_path in renamed_folders:
        if os.path.exists(temp_path):
            if os.path.exists(original_path):
                # 如果原路径已经存在，创建备份
                backup_path = f"{original_path}_backup_{int(time.time())}"
                print(f"原始路径已存在，将其移动到 {backup_path}")
                os.rename(original_path, backup_path)
                
            # 恢复原始文件夹名
            os.rename(temp_path, original_path)
            print(f"已恢复文件夹 {os.path.basename(original_path)}")
    
    renamed_folders = []

def start_server():
    """启动Flask后端服务器"""
    print("启动后端服务器...")
    # 使用subprocess以便可以获取进程ID并稍后终止
    process = subprocess.Popen([sys.executable, "app.py"],
                              stdout=subprocess.PIPE,
                              stderr=subprocess.PIPE,
                              universal_newlines=True)  # 使用文本模式处理输出
    return process

def open_browser():
    """在默认浏览器中打开应用"""
    url = "http://localhost:8080"
    print(f"正在浏览器中打开 {url}...")
    webbrowser.open(url)

def handle_signal(sig, frame):
    """处理Ctrl+C等信号"""
    print("\n正在关闭服务器...")
    global server_process
    
    if server_process:
        server_process.terminate()
        try:
            server_process.wait(timeout=5)  # 添加超时，避免无限等待
        except subprocess.TimeoutExpired:
            print("服务器停止超时，强制终止...")
            server_process.kill()
    
    # 恢复文件夹名称
    restore_renamed_folders()
    
    print("服务器已停止，清理完成")
    sys.exit(0)

def cleanup():
    """清理资源并恢复更改"""
    global server_process
    
    if server_process and server_process.poll() is None:
        server_process.terminate()
        try:
            server_process.wait(timeout=3)
        except:
            server_process.kill()
    
    restore_renamed_folders()

if __name__ == "__main__":
    try:
        print("="*50)
        print("Tiktoken Visualizer 启动工具 (Mac版)")
        print("="*50)
        
        # 注册信号处理器和退出处理
        signal.signal(signal.SIGINT, handle_signal)
        
        # 检查依赖
        check_dependencies()
        
        # 解决导入冲突
        resolve_import_conflicts()
        
        # 启动服务器
        server_process = start_server()
        
        # 等待服务器启动
        print("等待服务器启动...")
        time.sleep(3)
        
        # 打开浏览器
        open_browser()
        
        print("-"*50)
        print("Tiktoken Visualizer 正在运行!")
        print("后端服务器地址: http://localhost:8080")
        print("按 Ctrl+C 停止服务器")
        print("-"*50)
        
        # 实时监控服务器输出
        while True:
            # 检查服务器是否仍在运行
            if server_process.poll() is not None:
                # 服务器已退出
                return_code = server_process.returncode
                stdout, stderr = server_process.communicate()
                print(f"服务器退出 (返回码: {return_code})")
                
                if return_code != 0:
                    print(f"错误信息:")
                    print(stderr)
                    print("\n可能的解决方案:")
                    
                    if "ModuleNotFoundError" in stderr:
                        missing_module = stderr.split("ModuleNotFoundError: No module named '")[1].split("'")[0]
                        print(f"  - 缺少模块: {missing_module}, 请运行: pip install {missing_module}")
                    
                    if "ImportError: cannot import name" in stderr:
                        print("  - 导入冲突: 本地文件夹名与Python库冲突")
                        print("  - 建议: 重新运行此脚本并选择'y'以解决导入冲突")
                
                break
                
            # 短暂休眠，减少CPU使用
            time.sleep(0.5)
            
    except KeyboardInterrupt:
        handle_signal(signal.SIGINT, None)
    except Exception as e:
        print(f"发生错误: {str(e)}")
    finally:
        # 确保清理资源
        cleanup() 